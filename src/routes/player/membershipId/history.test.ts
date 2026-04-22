import { describe, expect, test } from "bun:test"

import { pgReader } from "@/integrations/postgres"
import { expectErr, expectOk } from "@/lib/test-utils"

import express from "express"
import request from "supertest"

import { playerHistoryRoute } from "./history"

describe("player activities 200", () => {
    const getExistingMembershipId = async () => {
        const existing = await pgReader.queryRow<{ membershipId: bigint }>(
            `SELECT membership_id AS "membershipId" FROM player ORDER BY membership_id DESC LIMIT 1`
        )
        return existing?.membershipId.toString() ?? null
    }

    const t = async (membershipId?: string, cursor?: Date) => {
        const resolvedMembershipId = membershipId ?? (await getExistingMembershipId())
        if (!resolvedMembershipId) {
            return null
        }

        const result = await playerHistoryRoute.$mock({
            params: { membershipId: resolvedMembershipId },
            query: { cursor }
        })

        expectOk(result)

        return result
    }

    test("returns activities for valid player id", () => t())

    test("returns activities for another valid player id", () => t())

    test("returns activities with year cursor", () => t())

    test("end of list", async () =>
        await t(undefined, new Date("2000-01-01T17:00:00Z")).then(result => {
            if (result?.type === "ok") {
                expect(result.parsed.activities.length).toBeFalsy()
            }
        }))

    test("final raid", async () =>
        await t(undefined, new Date("2019-06-24T17:00:00Z")).then(result => {
            if (result?.type === "ok") {
                expect(result.parsed.activities.length).toBeGreaterThanOrEqual(0)
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
    const t = async () => {
        const privatePlayer = await pgReader.queryRow<{ membershipId: bigint }>(
            `SELECT membership_id AS "membershipId"
            FROM player
            WHERE is_private = true
            ORDER BY membership_id DESC
            LIMIT 1`
        )
        if (!privatePlayer) {
            return
        }

        const result = await playerHistoryRoute.$mock({
            params: {
                membershipId: privatePlayer.membershipId.toString()
            },
            query: {}
        })

        expectErr(result)
    }

    test("returns 403 for private profile", () => t())
})

describe("activities middleware", () => {
    const app = express()

    app.use(express.json())

    app.use("/test/:membershipId", playerHistoryRoute.mountable)

    test("1 day cache on 200 cursor query", async () => {
        const membershipId = (
            await pgReader.queryRow<{ membershipId: bigint }>(
                `SELECT membership_id AS "membershipId" FROM player ORDER BY membership_id DESC LIMIT 1`
            )
        )?.membershipId.toString()
        if (!membershipId) {
            return
        }

        const res = await request(app)
            .get(`/test/${membershipId}`)
            .query({ cursor: new Date("2024-01-14T17:00:00Z") })

        expect(res.status).toBe(200)
        expect(res.headers).toMatchObject({
            "cache-control": "max-age=86400"
        })
    })

    test("30s cache on 200", async () => {
        const membershipId = (
            await pgReader.queryRow<{ membershipId: bigint }>(
                `SELECT membership_id AS "membershipId" FROM player ORDER BY membership_id DESC LIMIT 1`
            )
        )?.membershipId.toString()
        if (!membershipId) {
            return
        }

        const res = await request(app).get(`/test/${membershipId}`)

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
