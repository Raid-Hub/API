import { DiscordComponentsV2Response } from "./types"

type DiscordEmbedField = {
    name: string
    value: string
    inline?: boolean
}

type DiscordEmbed = {
    title?: string
    description?: string
    fields?: DiscordEmbedField[]
    color?: number
    timestamp?: string
}

type DiscordMessageData = DiscordComponentsV2Response["data"] & {
    embeds?: DiscordEmbed[]
}

export const buildDiscordContentMessage = (content: string): DiscordMessageData => ({
    content
})

export const buildDiscordEmbedMessage = (embed: DiscordEmbed): DiscordMessageData => ({
    embeds: [embed]
})

