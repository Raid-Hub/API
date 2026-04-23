import { RequestHandler } from "express"
import type { IncomingHttpHeaders } from "http"
import jwt from "jsonwebtoken"
import { zJWTAuthFormat, type JWTAuthContext } from "./jwt"

const BEARER_AUTH_SCHEME = "Bearer"

const extractBearerToken = (authorizationHeader?: string) => {
    if (!authorizationHeader) return null
    const [scheme, token] = authorizationHeader.trim().split(" ")
    if (scheme !== BEARER_AUTH_SCHEME) return null
    return token || null
}

const authorizationHeaderValue = (headers: IncomingHttpHeaders): string | undefined => {
    const raw = headers.authorization
    if (raw === undefined) return undefined
    if (Array.isArray(raw)) return raw[0]
    return raw
}

/** Parse Bearer JWT into auth context (used by Express middleware and route $mock). */
export const authFromHeaders = (headers: IncomingHttpHeaders): JWTAuthContext | undefined => {
    const token = extractBearerToken(authorizationHeaderValue(headers))
    if (!token) return undefined

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        return zJWTAuthFormat.parse(decoded)
    } catch {
        return undefined
    }
}

export const attachUserAuth: RequestHandler = (req, _res, next) => {
    req.auth = authFromHeaders(req.headers)
    next()
}
