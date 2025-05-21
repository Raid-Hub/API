import { describe, expect, test } from "bun:test"
import express from "express"
import request from "supertest"
import { cacheControl } from "./cache-control"

const app = express()

app.use("/test", cacheControl(30), (req: express.Request, res: express.Response) => {
    if (req.query.good === "true") {
        res.status(200).json({
            message: "Hello World"
        })
    } else {
        res.status(503).json({
            message: "Goodbye World"
        })
    }
})

describe("cache control", () => {
    test("cache on 200", async () => {
        const res = await request(app).get("/test").query({ good: "true" })

        expect(res.status).toBe(200)
        expect(res.headers).toMatchObject({
            "cache-control": "max-age=30"
        })
    })

    test("no cache on error", async () => {
        const res = await request(app).get("/test").query({ good: "false" })

        expect(res.status).toBe(503)
        expect(res.headers["cache-control"]).toBeUndefined()
    })
})
