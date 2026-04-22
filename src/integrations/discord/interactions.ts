import { Router } from "express"
import { createPublicKey, verify } from "crypto"
import { InteractionResponseType, InteractionType } from "discord-api-types/v10"
import { Logger } from "@/lib/utils/logging"
import { router as rootRouter } from "@/routes/index"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import {
    buildRouteInvocationRequest,
    collectDiscordExposedRoutes,
    deriveDiscordOptionNames
} from "./command-registry"
import {
    mapDiscordComponentInteraction,
    mapDiscordKnownError,
    mapDiscordSuccess
} from "./response-registry"
import { DiscordComponentsV2Response, DiscordInteraction } from "./types"

const SIGNATURE_WINDOW_MS = 5 * 60 * 1000
const logger = new Logger("DISCORD_INTERACTIONS")

const toDiscordPublicKey = (hex: string) => {
    const raw = Buffer.from(hex, "hex")
    const derHeader = Buffer.from("302a300506032b6570032100", "hex")
    return createPublicKey({
        key: Buffer.concat([derHeader, raw]),
        format: "der",
        type: "spki"
    })
}

const verifyDiscordSignature = (args: {
    timestamp: string
    signatureHex: string
    rawBody: Buffer
}): boolean => {
    const publicKeyHex = process.env.DISCORD_PUBLIC_KEY
    if (!publicKeyHex) return false

    const timestampMs = Number(args.timestamp) * 1000
    if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > SIGNATURE_WINDOW_MS) {
        return false
    }

    const message = Buffer.concat([Buffer.from(args.timestamp), args.rawBody])
    const signature = Buffer.from(args.signatureHex, "hex")
    return verify(null, message, toDiscordPublicKey(publicKeyHex), signature)
}

const toComponentsResponse = (content: string): DiscordComponentsV2Response => ({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
        content
    }
})

const interactionAppId = () => {
    const value = process.env.DISCORD_APPLICATION_ID?.trim()
    if (!value) throw new Error("DISCORD_APPLICATION_ID is required for deferred command responses")
    return value
}

const patchOriginalInteractionResponse = async (
    interaction: DiscordInteraction,
    message: DiscordComponentsV2Response["data"]
) => {
    const applicationId = interaction.application_id ?? interactionAppId()
    const response = await fetch(
        `https://discord.com/api/v10/webhooks/${applicationId}/${interaction.token}/messages/@original`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(message)
        }
    )

    if (!response.ok) {
        const detail = await response.text()
        throw new Error(`Failed to update interaction response (${response.status}): ${detail}`)
    }
}

export const discordInteractionsRouter = Router()

discordInteractionsRouter.post("/interactions", async (req, res) => {
    const signature = req.header("X-Signature-Ed25519")
    const timestamp = req.header("X-Signature-Timestamp")
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("")

    if (!signature || !timestamp || !verifyDiscordSignature({ signatureHex: signature, timestamp, rawBody })) {
        res.status(401).json({
            minted: new Date(),
            success: false,
            code: ErrorCode.InvalidDiscordAuthError,
            error: {
                message: "Invalid Discord signature"
            }
        })
        return
    }

    const interaction = JSON.parse(rawBody.toString("utf8")) as DiscordInteraction
    if (interaction.type === InteractionType.Ping) {
        res.status(200).json({ type: InteractionResponseType.Pong })
        return
    }

    if (interaction.type === InteractionType.MessageComponent) {
        const updated = mapDiscordComponentInteraction(interaction)
        if (!updated) {
            res.status(400).json(toComponentsResponse("Unsupported interaction component"))
            return
        }
        res.status(200).json({
            type: InteractionResponseType.UpdateMessage,
            data: updated
        })
        return
    }

    if (interaction.type !== InteractionType.ApplicationCommand || !interaction.data?.name) {
        res.status(400).json(toComponentsResponse("Unsupported interaction type"))
        return
    }

    const commandMap = collectDiscordExposedRoutes(rootRouter)
    const binding = commandMap.get(interaction.data.name)

    if (!binding) {
        res.status(200).json(toComponentsResponse("This command is not enabled yet."))
        return
    }

    const processCommand = async () => {
        const apiRequest = buildRouteInvocationRequest(interaction, binding)
        let result: Awaited<ReturnType<typeof binding.route.invoke>>
        try {
            result = await binding.route.invoke(apiRequest)
        } catch (err) {
            logger.error(
                "DISCORD_ROUTE_INVOKE_FAILED",
                err instanceof Error ? err : new Error(String(err)),
                {
                    command: binding.commandName,
                    route_id: binding.routeId
                }
            )
            await patchOriginalInteractionResponse(
                interaction,
                toComponentsResponse(`Execution failed for \`${binding.commandName}\`.`).data
            )
            return
        }

        if (result.success) {
            const mapped = mapDiscordSuccess(binding, result)
            if (mapped) {
                await patchOriginalInteractionResponse(interaction, mapped)
                return
            }
            await patchOriginalInteractionResponse(
                interaction,
                toComponentsResponse(`Success for \`${binding.commandName}\` (${binding.routeId})`).data
            )
            return
        }

        const mappedError = mapDiscordKnownError(binding, result)
        if (mappedError) {
            await patchOriginalInteractionResponse(interaction, mappedError)
            return
        }
        await patchOriginalInteractionResponse(
            interaction,
            toComponentsResponse(`Request failed with \`${result.code}\` while running \`${binding.commandName}\`.`).data
        )
    }

    res.status(200).json({
        type: InteractionResponseType.DeferredChannelMessageWithSource
    })

    void processCommand().catch(async () => {
        try {
            const knownOptions = deriveDiscordOptionNames(binding.route)
            const receivedOptions = (interaction.data?.options ?? [])
                .map(option => option.name)
                .join(", ")
            await patchOriginalInteractionResponse(
                interaction,
                toComponentsResponse(
                    `Unable to run \`${binding.commandName}\`. Expected options: ${knownOptions.join(", ")}. Received: ${receivedOptions || "none"}.`
                ).data
            )
        } catch (err) {
            logger.error(
                "DISCORD_COMMAND_RESPONSE_FAILED",
                err instanceof Error ? err : new Error(String(err)),
                {
                    command: binding.commandName,
                    route_id: binding.routeId
                }
            )
        }
    })
})
