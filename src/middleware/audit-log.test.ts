import { adminProtected } from "@/auth/admin"
import { generateJWT } from "@/auth/jwt"
import { attachUserAuth } from "@/auth/user-context"
import * as auditLog from "@/lib/audit/audit-log"
import { describe, expect, spyOn, test } from "bun:test"
import express from "express"
import request from "supertest"

import { auditRoute } from "./audit-log"

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret"

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

    const buildAuthedApp = (
        path: string,
        config: Parameters<typeof auditRoute>[0],
        handler: express.RequestHandler
    ) => {
        const app = express()
        app.use(express.json())
        app.use(attachUserAuth)
        app.use(adminProtected)
        app.use(path, auditRoute(config), handler)
        return app
    }

    test("logs successful admin mutation with actor, params, and request body", async () => {
        const auditSpy = spyOn(auditLog, "writeAuditLog").mockImplementation(() => {})

        try {
            const app = buildAuthedApp(
                "/admin/reporting/blacklist/:instanceId",
                {
                    action: "reporting.blacklist.update",
                    responseFields: ["blacklisted"]
                },
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
            expect(record.errorCode).toBeUndefined()
        } finally {
            auditSpy.mockRestore()
        }
    })

    test("logs failure outcome and error code", async () => {
        const auditSpy = spyOn(auditLog, "writeAuditLog").mockImplementation(() => {})

        try {
            const app = buildAuthedApp(
                "/admin/reporting/player/:membershipId",
                {
                    action: "reporting.player.update",
                    responseFields: ["updated"]
                },
                (_req, res) => {
                    res.status(404).json({
                        minted: new Date(),
                        success: false,
                        code: "PlayerNotFoundError",
                        error: { playerId: "999" }
                    })
                }
            )

            await request(app)
                .patch("/admin/reporting/player/999")
                .set("Authorization", "Bearer " + adminToken())
                .send({ flagged: true })

            expect(auditSpy).toHaveBeenCalledTimes(1)
            const record = auditSpy.mock.calls[0][0]
            expect(record.outcome).toBe("failure")
            expect(record.statusCode).toBe(404)
            expect(record.errorCode).toBe("PlayerNotFoundError")
            expect(record.response?.success).toBe(false)
            expect(record.response?.code).toBe("PlayerNotFoundError")
        } finally {
            auditSpy.mockRestore()
        }
    })

    test("strips query string from route", async () => {
        const auditSpy = spyOn(auditLog, "writeAuditLog").mockImplementation(() => {})

        try {
            const app = buildAuthedApp(
                "/admin/query",
                { action: "admin.query.execute" },
                (_req, res) => {
                    res.status(200).json({ success: true, response: { rows: [] } })
                }
            )

            await request(app)
                .post("/admin/query?debug=1")
                .set("Authorization", "Bearer " + adminToken())
                .send({ query: "SELECT 1", type: "readonly" })

            const record = auditSpy.mock.calls[0][0]
            expect(record.route).toBe("/admin/query")
        } finally {
            auditSpy.mockRestore()
        }
    })

    test("respects includeParams and includeBody flags", async () => {
        const auditSpy = spyOn(auditLog, "writeAuditLog").mockImplementation(() => {})

        try {
            const app = buildAuthedApp(
                "/admin/reporting/blacklist/:instanceId",
                {
                    action: "reporting.blacklist.update",
                    includeParams: false,
                    includeBody: false
                },
                (_req, res) => {
                    res.status(200).json({ success: true })
                }
            )

            await request(app)
                .put("/admin/reporting/blacklist/16897747714")
                .set("Authorization", "Bearer " + adminToken())
                .send({ reason: "secret reason" })

            const record = auditSpy.mock.calls[0][0]
            expect(record.params).toBeUndefined()
            expect(record.request).toBeUndefined()
        } finally {
            auditSpy.mockRestore()
        }
    })

    test("applies custom redactBodyKeys", async () => {
        const auditSpy = spyOn(auditLog, "writeAuditLog").mockImplementation(() => {})

        try {
            const app = buildAuthedApp(
                "/admin/query",
                {
                    action: "admin.query.execute",
                    redactBodyKeys: ["query"]
                },
                (_req, res) => {
                    res.status(200).json({ success: true })
                }
            )

            await request(app)
                .post("/admin/query")
                .set("Authorization", "Bearer " + adminToken())
                .send({ query: "SELECT * FROM player", type: "readonly" })

            const record = auditSpy.mock.calls[0][0]
            expect(record.request?.query).toBe("[REDACTED]")
            expect(record.request?.type).toBe("readonly")
        } finally {
            auditSpy.mockRestore()
        }
    })

    test("picks response fields from unwrapped body", async () => {
        const auditSpy = spyOn(auditLog, "writeAuditLog").mockImplementation(() => {})

        try {
            const app = buildAuthedApp(
                "/admin/custom",
                {
                    action: "custom.action",
                    responseFields: ["value"]
                },
                (_req, res) => {
                    res.status(200).json({ value: 42, extra: "ignored" })
                }
            )

            await request(app)
                .post("/admin/custom")
                .set("Authorization", "Bearer " + adminToken())
                .send({})

            const record = auditSpy.mock.calls[0][0]
            expect(record.response).toEqual({ value: 42 })
        } finally {
            auditSpy.mockRestore()
        }
    })

    test("omits response when body is not an object", async () => {
        const auditSpy = spyOn(auditLog, "writeAuditLog").mockImplementation(() => {})

        try {
            const app = buildAuthedApp(
                "/admin/custom",
                { action: "custom.action", responseFields: ["value"] },
                (_req, res) => {
                    res.status(204).end()
                }
            )

            await request(app)
                .post("/admin/custom")
                .set("Authorization", "Bearer " + adminToken())

            const record = auditSpy.mock.calls[0][0]
            expect(record.response).toBeUndefined()
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
