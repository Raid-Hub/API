import { describe, expect, test } from "bun:test"

import { expectErr, expectOk } from "@/lib/test-utils"

import express from "express"
import request from "supertest"

import { playerHistoryRoute } from "./history"

describe("player activities 200", () => {
    const t = async (membershipId: string, cursor?: Date) => {
        const result = await playerHistoryRoute.$mock({
            params: { membershipId },
            query: { cursor }
        })

        expectOk(result)

        return result
    }

    test("returns activities for valid player id", () => t("4611686018488107374"))

    test("returns activities for another valid player id", () => t("4611686018467831285"))

    test("returns activities with year cursor", () => t("4611686018501336567"))

    test("end of list", async () =>
        await t("4611686018488107374", new Date("2000-01-01T17:00:00Z")).then(result => {
            if (result.type === "ok") {
                expect(result.parsed.activities.length).toBeFalsy()
            }
        }))

    test("final raid", async () =>
        await t("4611686018488107374", new Date("2019-06-24T17:00:00Z")).then(result => {
            if (result.type === "ok") {
                expect(result.parsed.activities.length).toBe(2)
            }
        }))
})

describe("player activities 404", () => {
    const t = async (membershipId: string) => {
        const result = await playerHistoryRoute.$mock({
            params: {
                membershipId
            },
            query: {}
        })

        expectErr(result)
    }

    test("returns 404 for invalid player id", () => t("1"))
})

describe("player activities 403", () => {
    const t = async (membershipId: string) => {
        const result = await playerHistoryRoute.$mock({
            params: {
                membershipId
            },
            query: {}
        })

        expectErr(result)
    }

    test("returns 403 for private profile", () => t("4611686018467346804"))
})

describe("activities middleware", () => {
    const app = express()

    app.use(express.json())

    app.use("/test/:membershipId", playerHistoryRoute.express)

    test("1 day cache on 200 cursor query", async () => {
        const res = await request(app)
            .get("/test/4611686018488107374")
            .query({ cursor: new Date("2024-01-14T17:00:00Z") })

        expect(res.status).toBe(200)
        expect(res.headers).toMatchObject({
            "cache-control": "max-age=86400"
        })
    })

    test("30s cache on 200", async () => {
        const res = await request(app).get("/test/4611686018488107374")

        expect(res.status).toBe(200)
        expect(res.headers).toMatchObject({
            "cache-control": "max-age=30"
        })
    })

    test("no cache on error", async () => {
        const res = await request(app).get("/test/3611686018488107374")

        expect(res.status).toBe(404)
        expect(res.headers["cache-control"]).toBeUndefined()
    })
})
