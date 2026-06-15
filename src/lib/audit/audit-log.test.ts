import { Logger } from "@/lib/utils/logging"
import { describe, expect, spyOn, test } from "bun:test"

import { writeAuditLog } from "./audit-log"

describe("writeAuditLog", () => {
    test("forwards full record to logger with stringified optional fields", () => {
        const infoSpy = spyOn(Logger.prototype, "info").mockImplementation(() => {})

        try {
            writeAuditLog({
                action: "reporting.blacklist.update",
                actorBungieMembershipId: "4611686018555780000",
                method: "PUT",
                route: "/admin/reporting/blacklist/123",
                outcome: "success",
                statusCode: 200,
                params: { instanceId: "123" },
                request: { reason: "2 man" },
                response: { blacklisted: true },
                errorCode: "PlayerNotFoundError"
            })

            expect(infoSpy).toHaveBeenCalledTimes(1)
            expect(infoSpy).toHaveBeenCalledWith("ADMIN_ACTION", {
                action: "reporting.blacklist.update",
                actor_bungie_membership_id: "4611686018555780000",
                method: "PUT",
                route: "/admin/reporting/blacklist/123",
                outcome: "success",
                status_code: 200,
                params: JSON.stringify({ instanceId: "123" }),
                request: JSON.stringify({ reason: "2 man" }),
                response: JSON.stringify({ blacklisted: true }),
                error_code: "PlayerNotFoundError"
            })
        } finally {
            infoSpy.mockRestore()
        }
    })

    test("omits optional fields when absent", () => {
        const infoSpy = spyOn(Logger.prototype, "info").mockImplementation(() => {})

        try {
            writeAuditLog({
                action: "admin.query.execute",
                actorBungieMembershipId: "4611686018555780000",
                method: "POST",
                route: "/admin/query",
                outcome: "failure",
                statusCode: 403
            })

            expect(infoSpy).toHaveBeenCalledWith("ADMIN_ACTION", {
                action: "admin.query.execute",
                actor_bungie_membership_id: "4611686018555780000",
                method: "POST",
                route: "/admin/query",
                outcome: "failure",
                status_code: 403
            })
        } finally {
            infoSpy.mockRestore()
        }
    })
})
