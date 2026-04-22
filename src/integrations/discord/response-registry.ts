import { buildDiscordContentMessage, buildDiscordEmbedMessage } from "./message-builders"
import { DiscordExposedRoute } from "./command-registry"
import { DiscordComponentsV2Response, DiscordInteraction } from "./types"
import { ButtonStyle, ComponentType, InteractionType } from "discord-api-types/v10"
import { playerSearchRoute } from "@/routes/player/search"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zInstanceExtended } from "@/schema/components/InstanceExtended"
import { randomUUID } from "crypto"
import { z } from "zod"

type DiscordInvocationSuccess = { success: true; response: unknown }
type DiscordInvocationFailure = { success: false; code: string; error: unknown }

type DiscordResponseMapper = {
    mapSuccess?: (response: unknown) => DiscordComponentsV2Response["data"]
    mapKnownErrors?: Partial<Record<string, (error: unknown) => DiscordComponentsV2Response["data"]>>
}

const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}h ${m}m ${s}s`
}

const formatInstanceDiscordSummary = (response: z.infer<typeof zInstanceExtended>) =>
    buildDiscordEmbedMessage({
        title: response.metadata.activityName,
        description: `Instance \`${response.instanceId}\``,
        color: 0x5865f2,
        fields: [
            { name: "Version", value: response.metadata.versionName, inline: true },
            { name: "Players", value: String(response.playerCount), inline: true },
            { name: "Duration", value: formatDuration(response.duration), inline: true },
            { name: "Completed", value: response.completed ? "Yes" : "No", inline: true },
            { name: "Fresh", value: response.fresh ? "Yes" : "No", inline: true },
            { name: "Flawless", value: response.flawless ? "Yes" : "No", inline: true },
            {
                name: "Completed At",
                value:
                    response.dateCompleted instanceof Date
                        ? response.dateCompleted.toISOString()
                        : String(response.dateCompleted),
                inline: false
            }
        ]
    })

type PlayerSearchResponse = z.infer<typeof playerSearchRoute.responseSchema>
type PlayerSearchPagerState = {
    createdAt: number
    response: PlayerSearchResponse
}
const PLAYER_SEARCH_PAGE_SIZE = 5
const PLAYER_SEARCH_PAGER_TTL_MS = 10 * 60 * 1000
const PLAYER_SEARCH_PAGER_PREFIX = "ps"
const playerSearchPager = new Map<string, PlayerSearchPagerState>()

const putPlayerSearchPagerState = (response: PlayerSearchResponse) => {
    const id = randomUUID().replace(/-/g, "").slice(0, 16)
    playerSearchPager.set(id, {
        createdAt: Date.now(),
        response
    })
    return id
}

const getPlayerSearchPagerState = (id: string) => {
    const state = playerSearchPager.get(id)
    if (!state) return null
    if (Date.now() - state.createdAt > PLAYER_SEARCH_PAGER_TTL_MS) {
        playerSearchPager.delete(id)
        return null
    }
    return state
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const formatPlayerName = (player: PlayerSearchResponse["results"][number]) => {
    if (player.bungieGlobalDisplayName) {
        const code = player.bungieGlobalDisplayNameCode ? `#${player.bungieGlobalDisplayNameCode}` : ""
        return `${player.bungieGlobalDisplayName}${code}`
    }
    return player.displayName ?? "Unknown Player"
}

const parsePlayerSearchButtonId = (customId: string) => {
    const parts = customId.split(":")
    if (parts.length !== 3) return null
    if (parts[0] !== PLAYER_SEARCH_PAGER_PREFIX) return null
    const page = Number(parts[2])
    if (!Number.isInteger(page)) return null
    return {
        stateId: parts[1],
        page
    }
}

const renderPlayerSearchSummary = (response: PlayerSearchResponse, stateId: string, page: number) => {
    if (response.results.length === 0 || page < 0) {
        return buildDiscordContentMessage(`No players found for \`${response.params.query}\`.`)
    }

    const totalPages = Math.max(1, Math.ceil(response.results.length / PLAYER_SEARCH_PAGE_SIZE))
    const currentPage = clamp(page, 0, totalPages - 1)
    const start = currentPage * PLAYER_SEARCH_PAGE_SIZE
    const preview = response.results.slice(start, start + PLAYER_SEARCH_PAGE_SIZE)
    const lines = preview.map((player, idx) => {
        const membershipType = player.membershipType === null ? "unknown" : String(player.membershipType)
        return `${start + idx + 1}. **${formatPlayerName(player)}** (\`${player.membershipId}\`, type ${membershipType})`
    })

    const message = buildDiscordEmbedMessage({
        title: "Player Search Results",
        description:
            `Query: \`${response.params.query}\`\n` +
            `Page ${currentPage + 1}/${totalPages} - showing ${preview.length}/${response.results.length} result(s).`,
        color: 0x57f287,
        fields: [
            {
                name: "Matches",
                value: lines.join("\n"),
                inline: false
            }
        ]
    })

    return {
        ...message,
        components: [
            {
                type: ComponentType.ActionRow,
                components: [
                    {
                        type: ComponentType.Button,
                        style: ButtonStyle.Secondary,
                        custom_id: `${PLAYER_SEARCH_PAGER_PREFIX}:${stateId}:${currentPage - 1}`,
                        label: "Prev",
                        disabled: currentPage <= 0
                    },
                    {
                        type: ComponentType.Button,
                        style: ButtonStyle.Secondary,
                        custom_id: `${PLAYER_SEARCH_PAGER_PREFIX}:${stateId}:${currentPage + 1}`,
                        label: "Next",
                        disabled: currentPage >= totalPages - 1
                    }
                ]
            }
        ]
    }
}

const formatPlayerSearchSummary = (rawResponse: unknown) => {
    const response = playerSearchRoute.responseSchema.parse(rawResponse)
    const stateId = putPlayerSearchPagerState(response)
    return renderPlayerSearchSummary(response, stateId, 0)
}

const discordResponseByCommandName: Record<string, DiscordResponseMapper> = {
    instance: {
        mapSuccess: response => formatInstanceDiscordSummary(response as z.infer<typeof zInstanceExtended>),
        mapKnownErrors: {
            [ErrorCode.InstanceNotFoundError]: () => buildDiscordContentMessage("Instance not found.")
        }
    },
    "player-search": {
        mapSuccess: response => formatPlayerSearchSummary(response)
    }
}

export const getDiscordResponseMapper = (binding: DiscordExposedRoute): DiscordResponseMapper => {
    return discordResponseByCommandName[binding.commandName] ?? {}
}

export const mapDiscordSuccess = (
    binding: DiscordExposedRoute,
    result: DiscordInvocationSuccess
): DiscordComponentsV2Response["data"] | null => {
    return getDiscordResponseMapper(binding).mapSuccess?.(result.response) ?? null
}

export const mapDiscordKnownError = (
    binding: DiscordExposedRoute,
    result: DiscordInvocationFailure
): DiscordComponentsV2Response["data"] | null => {
    return getDiscordResponseMapper(binding).mapKnownErrors?.[result.code]?.(result.error) ?? null
}

export const mapDiscordComponentInteraction = (
    interaction: DiscordInteraction
): DiscordComponentsV2Response["data"] | null => {
    if (interaction.type !== InteractionType.MessageComponent) return null
    const customId = interaction.data?.custom_id ?? null
    if (!customId) return null
    const parsed = parsePlayerSearchButtonId(customId)
    if (!parsed) return null
    const state = getPlayerSearchPagerState(parsed.stateId)
    if (!state) {
        return buildDiscordContentMessage("This player search session expired. Run the command again.")
    }
    return renderPlayerSearchSummary(state.response, parsed.stateId, parsed.page)
}

