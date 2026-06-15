import { Logger } from "@/lib/utils/logging"

const logger = new Logger("AUDIT")

export type AuditOutcome = "success" | "failure"

export type AuditRecord = {
    action: string
    actorBungieMembershipId: string
    method: string
    route: string
    outcome: AuditOutcome
    statusCode: number
    params?: Record<string, unknown>
    request?: Record<string, unknown>
    response?: Record<string, unknown>
    errorCode?: string
}

export const writeAuditLog = (record: AuditRecord): void => {
    logger.info("ADMIN_ACTION", {
        action: record.action,
        actor_bungie_membership_id: record.actorBungieMembershipId,
        method: record.method,
        route: record.route,
        outcome: record.outcome,
        status_code: record.statusCode,
        ...(record.params ? { params: JSON.stringify(record.params) } : {}),
        ...(record.request ? { request: JSON.stringify(record.request) } : {}),
        ...(record.response ? { response: JSON.stringify(record.response) } : {}),
        ...(record.errorCode ? { error_code: record.errorCode } : {})
    })
}
