import { ErrorCode } from "@/schema/errors/ErrorCode"
import { InsufficientPermissionsError } from "@/schema/errors/InsufficientPermissionsError"
import { RequestHandler } from "express"

const error = (): InsufficientPermissionsError => ({
    minted: new Date(),
    success: false,
    code: ErrorCode.InsufficientPermissionsError,
    error: {
        message: "Forbidden"
    }
})

export const adminProtected: RequestHandler = (req, res, next) => {
    if (req.auth?.isAdmin) {
        next()
        return
    }
    res.status(403).json(error())
}
