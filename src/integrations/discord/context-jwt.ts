import jwt from "jsonwebtoken"
import { z } from "zod"

export const zDiscordInvocationContext = z.object({
    interactionId: z.string(),
    commandName: z.string(),
    userId: z.string(),
    guildId: z.string().optional(),
    channelId: z.string().optional(),
    routeId: z.string()
})

export type DiscordInvocationContext = z.infer<typeof zDiscordInvocationContext>

export const signDiscordInvocationContext = (context: DiscordInvocationContext) => {
    return jwt.sign(context, process.env.JWT_SECRET, {
        expiresIn: 120
    })
}

export const verifyDiscordInvocationContext = (token: string) => {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return zDiscordInvocationContext.parse(decoded)
}
