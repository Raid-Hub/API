import { writeAuditLog, type AuditOutcome } from "@/lib/audit/audit-log"
import { sanitizeForAudit } from "@/lib/audit/sanitize"
import { RequestHandler } from "express"
import type { ParamsDictionary, Query } from "express-serve-static-core"
import { RaidHubLocals } from "./types"

export type AuditRouteConfig = {
    /** Stable identifier, e.g. reporting.blacklist.update */
    action: string
    includeParams?: boolean
    includeBody?: boolean
    redactBodyKeys?: string[]
    /** Response JSON keys to include when present (e.g. blacklisted) */
    responseFields?: string[]
}

const pickResponseFields = (
    body: unknown,
    fields: string[] | undefined
): Record<string, unknown> | undefined => {
    if (typeof body !== "object" || body === null) {
        return undefined
    }

    const source = body as Record<string, unknown>
    const payload =
        source.response && typeof source.response === "object"
            ? (source.response as Record<string, unknown>)
            : source

    const picked: Record<string, unknown> = {}

    if (fields?.length) {
        for (const field of fields) {
            if (field in payload) {
                picked[field] = payload[field]
            }
        }
    }

    if ("success" in source) {
        picked.success = source.success
    }
    if (source.success === false && typeof source.code === "string") {
        picked.code = source.code
    }

    return Object.keys(picked).length > 0 ? picked : undefined
}

export const auditRoute = <
    P extends ParamsDictionary = ParamsDictionary,
    ResBody = unknown,
    ReqBody = unknown,
    ReqQuery extends Query = Query
>(
    config: AuditRouteConfig
): RequestHandler<P, ResBody, ReqBody, ReqQuery, RaidHubLocals> => {
    const includeParams = config.includeParams ?? true
    const includeBody = config.includeBody ?? true

    return (req, res, next) => {
        const originalJson = res.json.bind(res)

        res.json = ((body?: ResBody) => {
            res.locals._auditResponseBody = body
            return originalJson(body as ResBody)
        }) as typeof res.json

        res.once("finish", () => {
            const actor = req.auth?.bungieMembershipId
            if (!actor) {
                return
            }

            const statusCode = res.statusCode
            const outcome: AuditOutcome = statusCode >= 400 ? "failure" : "success"
            const responseBody = res.locals._auditResponseBody

            let errorCode: string | undefined
            if (
                typeof responseBody === "object" &&
                responseBody !== null &&
                "success" in responseBody
            ) {
                const failedResponse = responseBody as { success?: boolean; code?: unknown }
                if (failedResponse.success === false && typeof failedResponse.code === "string") {
                    errorCode = failedResponse.code
                }
            }

            writeAuditLog({
                action: config.action,
                actorBungieMembershipId: actor,
                method: req.method,
                route: req.originalUrl.split("?")[0] ?? req.path,
                outcome,
                statusCode,
                errorCode,
                ...(includeParams
                    ? {
                          params: sanitizeForAudit(req.params) as Record<string, unknown>
                      }
                    : {}),
                ...(includeBody && req.body != null
                    ? {
                          request: sanitizeForAudit(req.body, {
                              redactKeys: config.redactBodyKeys
                          }) as Record<string, unknown>
                      }
                    : {}),
                response: pickResponseFields(responseBody, config.responseFields)
            })
        })

        next()
    }
}
