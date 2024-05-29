import express from "express"
import request from "supertest"
import { generateJWT } from "../routes/authorize/admin"
import { adminProtected } from "./admin"

const app = express()

app.use("/admin", adminProtected, (req, res) => {
    res.status(200).json({
        message: "Hello World"
    })
})

describe("admin protected", () => {
    test("should return 403 if no authorization is provided", async () => {
        const res = await request(app).get("/admin")
        expect(res.status).toBe(403)
        expect(res.body.success).toBe(false)
        expect(res.body.errorCode).toBe("InsufficientPermissionsError")
    })

    test("should return 403 if invalid authorization is provided", async () => {
        const res = await request(app).get("/admin").set("Authorization", "Bearer 123")
        expect(res.status).toBe(403)
        expect(res.body.success).toBe(false)
        expect(res.body.errorCode).toBe("InsufficientPermissionsError")
    })

    test("should return 200 if valid authorization is provided", async () => {
        const token = generateJWT("234671294")
        const res = await request(app)
            .get("/admin")
            .set("Authorization", "Bearer " + token)
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({
            message: "Hello World"
        })
    })
})
