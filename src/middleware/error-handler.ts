import { Logger } from "@/lib/utils/logging"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { InternalServerError } from "@/schema/errors/InternalServerError"
import { ErrorRequestHandler } from "express"

const logger = new Logger("CATCH_ALL_ERROR_HANDLER")

// This is the final middleware run, so it cannot point to next
export const errorHandler: ErrorRequestHandler = (err: Error, req, res, __) => {
    logger.error("UNHANDLED_ERROR", err, {
        method: req.method,
        path: req.path,
        endpoint: req.url
    })

    const response: InternalServerError = {
        minted: new Date(),
        success: false,
        code: ErrorCode.InternalServerError,
        error: {
            message: process.env.PROD ? "Internal Server Error" : err.message
        }
    }
    res.status(500).send(response)
}
