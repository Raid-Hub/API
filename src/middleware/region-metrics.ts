import {
    httpRequestCountByContinent,
    httpRequestCountByRegion
} from "@/integrations/prometheus/metrics"
import { RequestHandler } from "express"
import { RaidHubLocals } from "./types"
import { ParamsDictionary, Query } from "express-serve-static-core"

/**
 * Helper to extract a string header value, handling both string and array cases
 */
function extractHeader(header: string | string[] | undefined): string {
    if (typeof header === "string") {
        return header.toLowerCase()
    } else if (Array.isArray(header) && header.length > 0) {
        return header[0].toLowerCase()
    }
    return "unknown"
}

/**
 * Middleware to track request counts by geographic and network metadata using Cloudflare headers.
 * Tracks:
 * - Country (CF-IPCountry) - ISO 3166-1 alpha-2 country code (always available)
 * - Continent (CF-IPContinent) - Continent code (requires "Add visitor location headers" Managed Transform)
 * - ASN (CF-IPASNum) - Autonomous System Number (always available)
 * 
 * Adds _region, _continent, and _asn properties to the locals.
 */
export const regionMetrics = <
    P extends ParamsDictionary = ParamsDictionary,
    ResBody = unknown,
    ReqBody = unknown,
    ReqQuery extends Query = Query
>(): RequestHandler<P, ResBody, ReqBody, ReqQuery, RaidHubLocals> => {
    return (req, res, next) => {
        res.locals._region = extractHeader(req.headers["cf-ipcountry"])
        res.locals._continent = extractHeader(req.headers["cf-ipcontinent"])
        res.locals._asn = extractHeader(req.headers["cf-ipasnum"])

        res.once("finish", () => {
            httpRequestCountByRegion.labels(res.locals._region).inc()
            httpRequestCountByContinent.labels(res.locals._continent).inc()
        })

        next()
    }
}
