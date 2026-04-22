import { RequestHandler } from "express"
import jwt from "jsonwebtoken"
import { zJWTAuthFormat } from "./jwt"

const BEARER_AUTH_SCHEME = "Bearer"

const extractBearerToken = (authorizationHeader?: string) => {
    if (!authorizationHeader) return null
    const [scheme, token] = authorizationHeader.trim().split(" ")
    if (scheme !== BEARER_AUTH_SCHEME) return null
    return token || null
}

export const attachUserAuth: RequestHandler = (req, _res, next) => {
    const token = extractBearerToken(req.headers.authorization)
    if (!token) {
        req.auth = undefined
        next()
        return
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.auth = zJWTAuthFormat.parse(decoded)
    } catch (error) {
        req.auth = undefined
    }
    next()
}
