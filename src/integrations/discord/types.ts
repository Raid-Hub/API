import { ApplicationCommandOptionType, InteractionResponseType, InteractionType } from "discord-api-types/v10"
import { IncomingHttpHeaders } from "http"

export type DiscordInteractionDataOption = {
    name: string
    type: ApplicationCommandOptionType
    value?: string | number | boolean
    options?: DiscordInteractionDataOption[]
}

export type DiscordInteraction = {
    id: string
    application_id?: string
    type: InteractionType
    token: string
    guild_id?: string
    channel_id?: string
    member?: {
        user?: {
            id: string
        }
    }
    data?: {
        id?: string
        name?: string
        options?: DiscordInteractionDataOption[]
        custom_id?: string
    }
}

export type DiscordApiStyleRequest = {
    params: Record<string, unknown>
    query: Record<string, unknown>
    body: unknown
    headers: IncomingHttpHeaders
}

export type DiscordComponentsV2Response = {
    type: InteractionResponseType.ChannelMessageWithSource
    data: {
        flags?: number
        content?: string
        components?: unknown[]
    }
}
