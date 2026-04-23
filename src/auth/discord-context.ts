import { verifyDiscordInvocationContext } from "@/integrations/discord/context-jwt"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { RequestHandler } from "express"

const DISCORD_AUTH_SCHEME = "Discord"

const extractDiscordContextToken = (authorizationHeader?: string) => {
    if (!authorizationHeader) return null
    const [scheme, token] = authorizationHeader.trim().split(" ")
    if (scheme !== DISCORD_AUTH_SCHEME) return null
    return token || null
}

export const attachDiscordContext: RequestHandler = (req, res, next) => {
    const token = extractDiscordContextToken(req.headers.authorization)
    if (!token) {
        req.discord = undefined
        next()
        return
    }

    try {
        req.discord = verifyDiscordInvocationContext(token)
        next()
    } catch {
        res.status(401).json({
            minted: new Date(),
            success: false,
            code: ErrorCode.InvalidDiscordAuthError,
            error: {
                message: "Invalid Discord context token"
            }
        })
    }
}
