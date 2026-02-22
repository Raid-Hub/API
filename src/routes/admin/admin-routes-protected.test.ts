import { generateJWT } from "@/auth/jwt"
import { describe, expect, test } from "bun:test"
import express from "express"
import request from "supertest"
import { adminRouter } from "./index"

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret"

const app = express()
app.use(express.json())
app.use("/admin", adminRouter.mountable)

const nonAdminToken = () =>
    generateJWT(
        {
            isAdmin: false,
            bungieMembershipId: "123",
            destinyMembershipIds: []
        },
        600
    )

function requestRoute(method: keyof ReturnType<typeof request>, path: string, body?: object) {
    switch (method) {
        case "get":
            return request(app).get(path)
        case "post":
            return body ? request(app)[method](path).send(body) : request(app)[method](path)
        case "put":
            return body ? request(app)[method](path).send(body) : request(app)[method](path)
        case "patch":
            return body ? request(app)[method](path).send(body) : request(app)[method](path)
        default:
            throw new Error(`Unsupported method: ${method}`)
    }
}

const adminRoutes: { method: keyof ReturnType<typeof request>; path: string; body?: object }[] = [
    {
        method: "post",
        path: "/admin/query",
        body: { query: "SELECT 1", type: "SELECT", ignoreCost: false }
    },
    { method: "get", path: "/admin/reporting/standing/123" },
    { method: "put", path: "/admin/reporting/blacklist/123" },
    { method: "get", path: "/admin/reporting/player/123" },
    { method: "patch", path: "/admin/reporting/player/123", body: {} }
]

describe.each(adminRoutes)("$method $path", ({ method, path, body }) => {
    test("returns 403 when no authorization provided", async () => {
        const res = await requestRoute(method, path, body)
        expect(res.status).toBe(403)
        expect(res.body.success).toBe(false)
        expect(res.body.code).toBe("InsufficientPermissionsError")
    })

    test("returns 403 when non-admin authorization provided", async () => {
        const res = await requestRoute(method, path, body).set(
            "Authorization",
            "Bearer " + nonAdminToken()
        )
        expect(res.status).toBe(403)
        expect(res.body.success).toBe(false)
        expect(res.body.code).toBe("InsufficientPermissionsError")
    })
})
