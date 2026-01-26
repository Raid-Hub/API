import { Logger } from "@/lib/utils/logging"
import { RequestHandler } from "express"
import type { ParamsDictionary, Query } from "express-serve-static-core"
import { RaidHubLocals } from "./types"

const logger = new Logger("REQUEST_LOGGING")

/**
 * Middleware to log request completion with duration and related metadata.
 * Should be used alongside duration metrics middleware, which is responsible
 * for populating timing information (e.g. `_duration`) on `res.locals`.
 * 
 * This middleware logs the request duration and Cloudflare region/ASN/continent.
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
