import { adminProtected } from "@/auth/admin"
import { generateJWT } from "@/auth/jwt"
import { attachUserAuth } from "@/auth/user-context"
import * as auditLog from "@/lib/audit/audit-log"
import { sanitizeForAudit } from "@/lib/audit/sanitize"
import { describe, expect, spyOn, test } from "bun:test"
import express from "express"
import request from "supertest"
import { auditRoute } from "./audit-log"

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret"

describe("sanitizeForAudit", () => {
    test("redacts sensitive keys", () => {
        expect(
            sanitizeForAudit({
                reason: "cheaters",
                password: "hunter2",
                nested: { apiKey: "secret-value" }
            })
        ).toEqual({
            reason: "cheaters",
            password: "[REDACTED]",
            nested: { apiKey: "[REDACTED]" }
        })
    })

    test("truncates long strings", () => {
        const long = "x".repeat(9000)
        const sanitized = sanitizeForAudit(long, { maxStringLength: 100 }) as string
        expect(sanitized.startsWith("x".repeat(100))).toBe(true)
        expect(sanitized).toContain("[truncated")
    })
})

describe("auditRoute middleware", () => {
    const adminToken = () =>
        generateJWT(
            {
                isAdmin: true,
                bungieMembershipId: "4611686018555780000",
                destinyMembershipIds: []
            },
            600
        )

    test("logs successful admin mutation with actor, params, and request body", async () => {
        const auditSpy = spyOn(auditLog, "writeAuditLog").mockImplementation(() => {})

        try {
            const app = express()
            app.use(express.json())
            app.use(attachUserAuth)
            app.use(adminProtected)
            app.put(
                "/admin/reporting/blacklist/:instanceId",
                auditRoute({
                    action: "reporting.blacklist.update",
                    responseFields: ["blacklisted"]
                }),
                (req, res) => {
                    res.status(200).json({
                        minted: new Date(),
                        success: true,
                        response: { blacklisted: true }
                    })
                }
            )

            const res = await request(app)
                .put("/admin/reporting/blacklist/16897747714")
                .set("Authorization", "Bearer " + adminToken())
                .send({
                    reason: "2 man",
                    removeBlacklist: false
                })

            expect(res.status).toBe(200)
            expect(auditSpy).toHaveBeenCalledTimes(1)

            const record = auditSpy.mock.calls[0][0]
            expect(record.action).toBe("reporting.blacklist.update")
            expect(record.actorBungieMembershipId).toBe("4611686018555780000")
            expect(record.outcome).toBe("success")
            expect(record.statusCode).toBe(200)
            expect(record.params?.instanceId).toBe("16897747714")
            expect(record.request?.reason).toBe("2 man")
            expect(record.response?.blacklisted).toBe(true)
        } finally {
            auditSpy.mockRestore()
        }
    })

    test("does not log when actor is missing", async () => {
        const auditSpy = spyOn(auditLog, "writeAuditLog").mockImplementation(() => {})

        try {
            const app = express()
            app.use(express.json())
            app.post("/admin/query", auditRoute({ action: "admin.query.execute" }), (_req, res) => {
                res.status(200).json({ success: true })
            })

            await request(app).post("/admin/query").send({ query: "SELECT 1" })

            expect(auditSpy).not.toHaveBeenCalled()
        } finally {
            auditSpy.mockRestore()
        }
    })
})
