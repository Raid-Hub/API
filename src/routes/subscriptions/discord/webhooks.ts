import { RaidHubRoute } from "@/core/RaidHubRoute"
import {
    zDiscordWebhookBody,
    zDiscordWebhookDeleteResponse,
    zDiscordWebhookPutResponse,
    zDiscordWebhookStatusResponse
} from "@/schema/components/DiscordSubscriptionWebhook"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zInsufficientPermissionsError } from "@/schema/errors/InsufficientPermissionsError"
import { zInvalidDiscordAuthError } from "@/schema/errors/InvalidDiscordAuthError"
import {
    deleteDiscordWebhook,
    getDiscordWebhookStatus,
    upsertDiscordWebhook
} from "@/services/subscriptions/discord-webhooks"

const discordGuildChannelAuthErrors = [
    {
        statusCode: 401 as const,
        code: ErrorCode.InvalidDiscordAuthError,
        schema: zInvalidDiscordAuthError.shape.error
    },
    {
        statusCode: 403 as const,
        code: ErrorCode.InsufficientPermissionsError,
        schema: zInsufficientPermissionsError.shape.error
    }
]

export const putDiscordWebhookRoute = new RaidHubRoute({
    method: "put",
    description:
        "Create or update the RaidHub subscription webhook for this channel (idempotent upsert).",
    body: zDiscordWebhookBody,
    response: {
        success: {
            statusCode: 200,
            schema: zDiscordWebhookPutResponse
        },
        errors: discordGuildChannelAuthErrors
    },
    async handler(req) {
        const guildId = req.discord?.guildId
        const channelId = req.discord?.channelId
        if (!guildId || !channelId) {
            return RaidHubRoute.fail(ErrorCode.InsufficientPermissionsError, {
                message: "Forbidden" as const
            })
        }
        return RaidHubRoute.ok(
            await upsertDiscordWebhook({
                ...req.body,
                guildId,
                channelId
            })
        )
    }
})

export const deleteDiscordWebhookRoute = new RaidHubRoute({
    method: "delete",
    description: "Delete a Discord subscription webhook registration for the current channel.",
    response: {
        success: {
            statusCode: 200,
            schema: zDiscordWebhookDeleteResponse
        },
        errors: discordGuildChannelAuthErrors
    },
    async handler(req) {
        if (!req.discord?.guildId || !req.discord.channelId) {
            return RaidHubRoute.fail(ErrorCode.InsufficientPermissionsError, {
                message: "Forbidden" as const
            })
        }
        await deleteDiscordWebhook(req.discord.channelId)
        return RaidHubRoute.ok({
            deleted: true
        })
    }
})

export const getDiscordWebhookStatusRoute = new RaidHubRoute({
    method: "get",
    description: "Get RaidHub subscription webhook status for the current channel (no secrets).",
    response: {
        success: {
            statusCode: 200,
            schema: zDiscordWebhookStatusResponse
        },
        errors: discordGuildChannelAuthErrors
    },
    async handler(req) {
        if (!req.discord?.guildId || !req.discord.channelId) {
            return RaidHubRoute.fail(ErrorCode.InsufficientPermissionsError, {
                message: "Forbidden" as const
            })
        }
        return RaidHubRoute.ok(await getDiscordWebhookStatus(req.discord.channelId))
    }
})
