import type { DiscordInvocationContext } from "@/integrations/discord/context-jwt"

declare global {
    namespace Express {
        interface Request {
            discord?: DiscordInvocationContext
        }
    }
}

export {}
