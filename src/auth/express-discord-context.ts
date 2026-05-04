import type { DiscordInvocationContext } from "@/integrations/discord/context-jwt"

export type DiscordRaidHubUser = {
    bungieMembershipId: string
}

declare global {
    namespace Express {
        interface Request {
            discord?: DiscordInvocationContext
            discordRaidHubUser?: DiscordRaidHubUser
        }
    }
}

export {}
