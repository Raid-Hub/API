import { describe, expect, test } from "bun:test"
import express from "express"
import request from "supertest"
import { adminProtected } from "./admin"
import { generateJWT } from "./jwt"

const app = express()

app.use("/admin", adminProtected, (req, res) => {
    res.status(200).json({
        message: "Hello World"
    })
})

describe("admin protected", () => {
    test("returns 403 when no authorization provided", async () => {
        const res = await request(app).get("/admin")
        expect(res.status).toBe(403)
        expect(res.body.success).toBe(false)
        expect(res.body.code).toBe("InsufficientPermissionsError")
    })

    test("returns 403 when invalid authorization provided", async () => {
        const res = await request(app).get("/admin").set("Authorization", "Bearer 123")
        expect(res.status).toBe(403)
        expect(res.body.success).toBe(false)
        expect(res.body.code).toBe("InsufficientPermissionsError")
    })

    test("returns 200 when valid admin authorization provided", async () => {
        const token = generateJWT(
            {
                isAdmin: true,
                bungieMembershipId: "123",
                destinyMembershipIds: []
            },
            600
        )

        const res = await request(app)
            .get("/admin")
            .set("Authorization", "Bearer " + token)
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({
            message: "Hello World"
        })
    })

    test("returns 403 when valid non-admin authorization provided", async () => {
        const token = generateJWT(
            {
                isAdmin: false,
                bungieMembershipId: "123",
                destinyMembershipIds: []
            },
            600
        )

        const res = await request(app)
            .get("/admin")
            .set("Authorization", "Bearer " + token)
        expect(res.status).toBe(403)
        expect(res.body.success).toBe(false)
        expect(res.body.code).toBe("InsufficientPermissionsError")
    })
})
