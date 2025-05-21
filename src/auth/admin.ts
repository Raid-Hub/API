import { ErrorCode } from "@/schema/errors/ErrorCode"
import { InsufficientPermissionsError } from "@/schema/errors/InsufficientPermissionsError"
import { RequestHandler } from "express"
import jwt from "jsonwebtoken"
import { zJWTAuthFormat } from "./jwt"

const error = (): InsufficientPermissionsError => ({
    minted: new Date(),
    success: false,
    code: ErrorCode.InsufficientPermissionsError,
    error: {
        message: "Forbidden"
    }
})

export const adminProtected: RequestHandler = (req, res, next) => {
    const authHeader = req.headers["authorization"]
    const [format, token] = authHeader ? authHeader.split(" ") : ["", ""]

    // TODO: DELETE
    next()
    return

    if (format !== "Bearer") {
        res.status(403).json(error())
        return
    }

    jwt.verify(token, process.env.JWT_SECRET!, (err, result) => {
        if (err) {
            res.status(403).json(error())
        } else {
            const data = zJWTAuthFormat.parse(result)
            if (data.isAdmin) {
                next()
            } else {
                res.status(403).json(error())
            }
        }
    })
}
