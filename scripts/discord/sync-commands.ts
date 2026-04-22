import { deriveDiscordCommandOptions, collectDiscordExposedRoutes } from "@/integrations/discord/command-registry"
import { router } from "@/routes/index"
import { ApplicationCommandOptionType, ApplicationCommandType } from "discord-api-types/v10"

type DiscordCommandPayload = {
    name: string
    description: string
    type: ApplicationCommandType.ChatInput
    options?: {
        type:
            | ApplicationCommandOptionType.String
            | ApplicationCommandOptionType.Integer
            | ApplicationCommandOptionType.Boolean
            | ApplicationCommandOptionType.Number
        name: string
        description: string
        required: boolean
    }[]
}

const getEnv = (key: string) => {
    const value = process.env[key]?.trim()
    if (!value) {
        throw new Error(`${key} is required`)
    }
    return value
}

const toPayload = (): DiscordCommandPayload[] => {
    const entries = [...collectDiscordExposedRoutes(router).values()]
    return entries
        .map(entry => ({
            name: entry.commandName.toLowerCase().slice(0, 32),
            description: (entry.description || `Run ${entry.commandName}`).slice(0, 100),
            type: ApplicationCommandType.ChatInput as const,
            options: deriveDiscordCommandOptions(entry.route)
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
}

const applicationId = getEnv("DISCORD_APPLICATION_ID")
const botToken = getEnv("DISCORD_BOT_TOKEN")
const guildId = process.env.DISCORD_GUILD_ID?.trim()
const dryRun = process.env.DISCORD_SYNC_DRY_RUN === "true"

const endpoint = guildId
    ? `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`
    : `https://discord.com/api/v10/applications/${applicationId}/commands`

const payload = toPayload()

if (dryRun) {
    console.log(
        JSON.stringify(
            {
                target: guildId ? `guild:${guildId}` : "global",
                endpoint,
                commands: payload
            },
            null,
            2
        )
    )
    process.exit(0)
}

try {
    const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        const details = await response.text()
        throw new Error(`Discord command sync failed (${response.status}): ${details}`)
    }

    console.log(`Synced ${payload.length} Discord command(s) to ${guildId ? "guild" : "global"} scope.`)
    process.exit(0)
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
}
