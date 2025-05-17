import { ErrorCode } from "@/schema/errors/ErrorCode"
import { InternalServerError } from "@/schema/errors/InternalServerError"
import { ErrorRequestHandler } from "express"

// This is the final middleware run, so it cannot point to next
export const errorHandler: ErrorRequestHandler = (err: Error, _, res, __) => {
    process.env.NODE_ENV !== "test" && console.error(err)

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
