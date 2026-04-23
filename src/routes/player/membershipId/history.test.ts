import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { getFixturePool } from "@/lib/test-fixture-db"
import { expectErr, expectOk } from "@/lib/test-utils"

import express from "express"
import request from "supertest"

import { playerHistoryRoute } from "./history"

const fixtureDb = getFixturePool()
const historyPublicMembershipId = "4611686019000000120"
const historyPrivateMembershipId = "4611686019000000121"
const historyInstanceId = "999000000120"

beforeAll(async () => {
    await fixtureDb.query(`DELETE FROM core.instance_player WHERE instance_id = $1::bigint`, [
        historyInstanceId
    ])
    await fixtureDb.query(
        `DELETE FROM flagging.flag_instance_player WHERE instance_id = $1::bigint`,
        [historyInstanceId]
    )
    await fixtureDb.query(
        `DELETE FROM flagging.blacklist_instance_player WHERE instance_id = $1::bigint`,
        [historyInstanceId]
    )
    await fixtureDb.query(
        `DELETE FROM flagging.blacklist_instance WHERE instance_id = $1::bigint`,
        [historyInstanceId]
    )
    await fixtureDb.query(`DELETE FROM flagging.flag_instance WHERE instance_id = $1::bigint`, [
        historyInstanceId
    ])
    await fixtureDb.query(`DELETE FROM raw.pgcr WHERE instance_id = $1::bigint`, [
        historyInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.instance WHERE instance_id = $1::bigint`, [
        historyInstanceId
    ])
    await fixtureDb.query(
        `DELETE FROM core.player_stats WHERE membership_id IN ($1::bigint, $2::bigint)`,
        [historyPublicMembershipId, historyPrivateMembershipId]
    )
    await fixtureDb.query(
        `DELETE FROM core.player WHERE membership_id IN ($1::bigint, $2::bigint)`,
        [historyPublicMembershipId, historyPrivateMembershipId]
    )

    await fixtureDb.query(
        `INSERT INTO core.player (
            membership_id, membership_type, icon_path, display_name,
            bungie_global_display_name, bungie_global_display_name_code, last_seen, first_seen,
            clears, fresh_clears, sherpas, total_time_played_seconds, sum_of_best, wfr_score,
            cheat_level, is_private, is_whitelisted, updated_at
        ) VALUES
        ($1::bigint, 3, NULL, 'fixture_history_pub', 'fixture_history_pub', '0120', NOW(), NOW(), 2, 1, 0, 200, 200, 0, 0, false, false, NOW()),
        ($2::bigint, 3, NULL, 'fixture_history_priv', 'fixture_history_priv', '0121', NOW(), NOW(), 0, 0, 0, 0, NULL, 0, 0, true, false, NOW())`,
        [historyPublicMembershipId, historyPrivateMembershipId]
    )

    await fixtureDb.query(
        `INSERT INTO core.instance (
            instance_id, hash, score, flawless, completed, fresh, player_count, date_started, date_completed, duration, platform_type, is_whitelisted, skull_hashes
        )
        SELECT
            $1::bigint, av.hash, 0, false, true, true, 1, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', 600, 3, false, ARRAY[]::bigint[]
        FROM definitions.activity_version av
        ORDER BY av.hash
        LIMIT 1`,
        [historyInstanceId]
    )

    await fixtureDb.query(
        `INSERT INTO core.instance_player (
            instance_id, membership_id, completed, time_played_seconds, sherpas, is_first_clear
        ) VALUES ($1::bigint, $2::bigint, true, 300, 0, false)`,
        [historyInstanceId, historyPublicMembershipId]
    )
})

afterAll(async () => {
    await fixtureDb.query(`DELETE FROM core.instance_player WHERE instance_id = $1::bigint`, [
        historyInstanceId
    ])
    await fixtureDb.query(
        `DELETE FROM flagging.flag_instance_player WHERE instance_id = $1::bigint`,
        [historyInstanceId]
    )
    await fixtureDb.query(
        `DELETE FROM flagging.blacklist_instance_player WHERE instance_id = $1::bigint`,
        [historyInstanceId]
    )
    await fixtureDb.query(
        `DELETE FROM flagging.blacklist_instance WHERE instance_id = $1::bigint`,
        [historyInstanceId]
    )
    await fixtureDb.query(`DELETE FROM flagging.flag_instance WHERE instance_id = $1::bigint`, [
        historyInstanceId
    ])
    await fixtureDb.query(`DELETE FROM raw.pgcr WHERE instance_id = $1::bigint`, [
        historyInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.instance WHERE instance_id = $1::bigint`, [
        historyInstanceId
    ])
    await fixtureDb.query(
        `DELETE FROM core.player_stats WHERE membership_id IN ($1::bigint, $2::bigint)`,
        [historyPublicMembershipId, historyPrivateMembershipId]
    )
    await fixtureDb.query(
        `DELETE FROM core.player WHERE membership_id IN ($1::bigint, $2::bigint)`,
        [historyPublicMembershipId, historyPrivateMembershipId]
    )
})

describe("player activities 200", () => {
    const t = async (membershipId: string, cursor?: Date) => {
        const result = await playerHistoryRoute.$mock({
            params: { membershipId },
            query: { cursor }
        })

        expectOk(result)

        return result
    }

    test("returns activities for valid player id", async () => {
        const result = await t(historyPublicMembershipId)
        if (result.type === "ok") {
            expect(result.parsed.activities.length).toBeGreaterThan(0)
        }
    })

    test("returns activities for another valid player id", async () => {
        const result = await t(historyPublicMembershipId)
        expect(result.type).toBe("ok")
    })

    test("returns activities with year cursor", async () => {
        const result = await t(historyPublicMembershipId, new Date("2024-01-14T17:00:00Z"))
        expect(result.type).toBe("ok")
    })

    test("end of list", async () => {
        const result = await t(historyPublicMembershipId, new Date("2000-01-01T17:00:00Z"))
        if (result.type === "ok") {
            expect(result.parsed.activities.length).toBeFalsy()
        }
    })

    test("final raid", async () => {
        const result = await t(historyPublicMembershipId, new Date("2019-06-24T17:00:00Z"))
        if (result.type === "ok") {
            expect(result.parsed.activities.length).toBeGreaterThan(0)
        }
    })
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
    test("returns 403 for private profile", async () => {
        const result = await playerHistoryRoute.$mock({
            params: {
                membershipId: historyPrivateMembershipId
            },
            query: {}
        })

        expectErr(result)
    })
})

describe("activities middleware", () => {
    const app = express()

    app.use(express.json())

    app.use("/test/:membershipId", playerHistoryRoute.mountable)

    test("1 day cache on 200 cursor query", async () => {
        const res = await request(app)
            .get(`/test/${historyPublicMembershipId}`)
            .query({ cursor: new Date("2024-01-14T17:00:00Z") })

        expect(res.status).toBe(200)
        expect(res.headers).toMatchObject({
            "cache-control": "max-age=86400"
        })
    })

    test("30s cache on 200", async () => {
        const res = await request(app).get(`/test/${historyPublicMembershipId}`)

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
