import { verifyDiscordInvocationContext } from "@/integrations/discord/context-jwt"
import { InvalidDiscordAuthError } from "@/schema/errors/InvalidDiscordAuthError"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { RequestHandler } from "express"
import { IncomingHttpHeaders } from "http"

const DISCORD_AUTH_SCHEME = "Discord"

const authorizationHeaderValue = (headers: IncomingHttpHeaders): string | undefined => {
    const raw = headers.authorization
    if (raw === undefined) return undefined
    if (Array.isArray(raw)) return raw[0]
    return raw
}

const extractDiscordContextToken = (authorizationHeader?: string) => {
    if (!authorizationHeader) return null
    const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2)
    if (scheme !== DISCORD_AUTH_SCHEME) return null
    return token || null
}

export const attachDiscordContext: RequestHandler = (req, res, next) => {
    const token = extractDiscordContextToken(authorizationHeaderValue(req.headers))
    if (!token) {
        req.discord = undefined
        next()
        return
    }

    try {
        req.discord = verifyDiscordInvocationContext(token)
        next()
    } catch {
        const err: InvalidDiscordAuthError = {
            minted: new Date(),
            success: false,
            code: ErrorCode.InvalidDiscordAuthError,
            error: {
                message: "Invalid Discord context token"
            }
        }
        res.status(401).json(err)
    }
}
