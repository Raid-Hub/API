import { Logger } from "@/lib/utils/logging"
import { RequestHandler } from "express"
import type { ParamsDictionary, Query } from "express-serve-static-core"
import { RaidHubLocals } from "./types"

const logger = new Logger("REQUEST_LOGGING")

/**
 * Middleware to log request completion with duration and status.
 * Should be used alongside duration metrics middleware.
 * 
 * Adds _startTime and _duration properties to the locals.
 */
export const requestLogging = <
    P extends ParamsDictionary = ParamsDictionary,
    ResBody = unknown,
    ReqBody = unknown,
    ReqQuery extends Query = Query
>(): RequestHandler<P, ResBody, ReqBody, ReqQuery, RaidHubLocals> => {
    return (_, res, next) => {
        res.once("finish", () => {
            const locals = (res.locals as RaidHubLocals)
            logger.debug("REQUEST_COMPLETED", {
                duration: `${locals._duration}ms`,
                region: locals._region,
                asn: locals._asn,
                continent: locals._continent
            })
        })
        next()
    }
}
