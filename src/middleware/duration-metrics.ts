import { httpRequestTimer } from "@/integrations/prometheus/metrics"
import { RequestHandler } from "express"
import { ParamsDictionary, Query } from "express-serve-static-core"
import { RaidHubLocals } from "./types"


/**
 * Factory function to create duration metrics middleware.
 * Tracks request duration in Prometheus with path and status code labels.
 * 
 * @param path The route path pattern (e.g., "/player/:membershipId")
 */
export const durationMetrics = <
    P extends ParamsDictionary = ParamsDictionary,
    ResBody = unknown,
    ReqBody = unknown,
    ReqQuery extends Query = Query
>(path: string): RequestHandler<P, ResBody, ReqBody, ReqQuery, RaidHubLocals> => {
    return (_, res, next) => {
        const start = Date.now()
        res.locals._startTime = start
        
        res.once("finish", () => {
            const responseTimeInMs = Date.now() - start
            res.locals._duration = responseTimeInMs

            const code = res.statusCode.toString()
            httpRequestTimer.labels(path, code).observe(responseTimeInMs)
        })
        
        next()
    }
}
