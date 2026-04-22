import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { generateJWT } from "@/auth/jwt"
import { getFixturePool } from "@/lib/test-fixture-db"
import { expectErr, expectOk } from "@/lib/test-utils"
import { ErrorCode } from "@/schema/errors/ErrorCode"

import { playerInstancesRoute } from "./instances"

const fixtureDb = getFixturePool()
const instancesPublicMembershipId = "4611686019000000901"
const instancesPrivateMembershipId = "4611686019000000902"
const instancesFixtureInstanceId = "999000000901"

beforeAll(async () => {
    await fixtureDb.query(`DELETE FROM core.instance_player WHERE instance_id = $1::bigint`, [
        instancesFixtureInstanceId
    ])
    await fixtureDb.query(
        `DELETE FROM flagging.flag_instance_player WHERE instance_id = $1::bigint`,
        [instancesFixtureInstanceId]
    )
    await fixtureDb.query(
        `DELETE FROM flagging.blacklist_instance_player WHERE instance_id = $1::bigint`,
        [instancesFixtureInstanceId]
    )
    await fixtureDb.query(
        `DELETE FROM flagging.blacklist_instance WHERE instance_id = $1::bigint`,
        [instancesFixtureInstanceId]
    )
    await fixtureDb.query(`DELETE FROM flagging.flag_instance WHERE instance_id = $1::bigint`, [
        instancesFixtureInstanceId
    ])
    await fixtureDb.query(`DELETE FROM raw.pgcr WHERE instance_id = $1::bigint`, [
        instancesFixtureInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.instance WHERE instance_id = $1::bigint`, [
        instancesFixtureInstanceId
    ])
    await fixtureDb.query(
        `DELETE FROM core.player_stats WHERE membership_id IN ($1::bigint, $2::bigint)`,
        [instancesPublicMembershipId, instancesPrivateMembershipId]
    )
    await fixtureDb.query(
        `DELETE FROM core.player WHERE membership_id IN ($1::bigint, $2::bigint)`,
        [instancesPublicMembershipId, instancesPrivateMembershipId]
    )

    await fixtureDb.query(
        `INSERT INTO core.player (
            membership_id, membership_type, icon_path, display_name,
            bungie_global_display_name, bungie_global_display_name_code, last_seen, first_seen,
            clears, fresh_clears, sherpas, total_time_played_seconds, sum_of_best, wfr_score,
            cheat_level, is_private, is_whitelisted, updated_at
        ) VALUES
        ($1::bigint, 3, NULL, 'fixture_instances_pub', 'fixture_instances_pub', '0901', NOW(), NOW(), 3, 2, 0, 500, 300, 0, 0, false, false, NOW()),
        ($2::bigint, 3, NULL, 'fixture_instances_priv', 'fixture_instances_priv', '0902', NOW(), NOW(), 0, 0, 0, 0, NULL, 0, 0, true, false, NOW())`,
        [instancesPublicMembershipId, instancesPrivateMembershipId]
    )

    await fixtureDb.query(
        `INSERT INTO core.instance (
            instance_id, hash, score, flawless, completed, fresh, player_count, date_started, date_completed, duration, platform_type, is_whitelisted, skull_hashes
        )
        SELECT
            $1::bigint, av.hash, 0, false, true, true, 3, TIMESTAMPTZ '2021-06-15 12:00:00Z', TIMESTAMPTZ '2021-06-15 13:00:00Z', 3600, 3, false, ARRAY[]::bigint[]
        FROM definitions.activity_version av
        ORDER BY av.hash
        LIMIT 1`,
        [instancesFixtureInstanceId]
    )

    await fixtureDb.query(
        `INSERT INTO core.instance_player (
            instance_id, membership_id, completed, time_played_seconds, sherpas, is_first_clear
        ) VALUES ($1::bigint, $2::bigint, true, 1200, 0, false)`,
        [instancesFixtureInstanceId, instancesPublicMembershipId]
    )
})

afterAll(async () => {
    await fixtureDb.query(`DELETE FROM core.instance_player WHERE instance_id = $1::bigint`, [
        instancesFixtureInstanceId
    ])
    await fixtureDb.query(
        `DELETE FROM flagging.flag_instance_player WHERE instance_id = $1::bigint`,
        [instancesFixtureInstanceId]
    )
    await fixtureDb.query(
        `DELETE FROM flagging.blacklist_instance_player WHERE instance_id = $1::bigint`,
        [instancesFixtureInstanceId]
    )
    await fixtureDb.query(
        `DELETE FROM flagging.blacklist_instance WHERE instance_id = $1::bigint`,
        [instancesFixtureInstanceId]
    )
    await fixtureDb.query(`DELETE FROM flagging.flag_instance WHERE instance_id = $1::bigint`, [
        instancesFixtureInstanceId
    ])
    await fixtureDb.query(`DELETE FROM raw.pgcr WHERE instance_id = $1::bigint`, [
        instancesFixtureInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.instance WHERE instance_id = $1::bigint`, [
        instancesFixtureInstanceId
    ])
    await fixtureDb.query(
        `DELETE FROM core.player_stats WHERE membership_id IN ($1::bigint, $2::bigint)`,
        [instancesPublicMembershipId, instancesPrivateMembershipId]
    )
    await fixtureDb.query(
        `DELETE FROM core.player WHERE membership_id IN ($1::bigint, $2::bigint)`,
        [instancesPublicMembershipId, instancesPrivateMembershipId]
    )
})

describe("instances 200", () => {
    const t = async (
        query?: {
            activityId?: number
            versionId?: number
            season?: number
            completed?: boolean
            flawless?: boolean
            fresh?: boolean
            playerCount?: number
            minPlayerCount?: number
            maxPlayerCount?: number
            minDurationSeconds?: number
            maxDurationSeconds?: number
            minSeason?: number
            maxSeason?: number
            minDate?: Date
            maxDate?: Date
        },
        expectAtLeastOneRow = false
    ) => {
        const token = generateJWT(
            {
                isAdmin: false,
                bungieMembershipId: "123",
                destinyMembershipIds: [instancesPublicMembershipId]
            },
            600
        )

        const result = await playerInstancesRoute.$mock({
            params: { membershipId: instancesPublicMembershipId },
            query,
            headers: { authorization: `Bearer ${token}` }
        })

        expectOk(result)
        if (result.type === "ok" && expectAtLeastOneRow) {
            expect(result.parsed.length).toBeGreaterThan(0)
        }
    }

    test("no filters", () => t(undefined, true))

    test("season", () =>
        t({
            season: 14
        }))

    test("completion status", () =>
        t({
            completed: true,
            flawless: false,
            fresh: true
        }))

    test("season range", () =>
        t({
            minSeason: 14,
            maxSeason: 20
        }))

    test("date range", () =>
        t({
            minDate: new Date("2021-01-01"),
            maxDate: new Date("2021-12-31")
        }))

    test("player count", () =>
        t({
            playerCount: 3
        }))

    test("player count range", () =>
        t({
            minPlayerCount: 2,
            maxPlayerCount: 4
        }))

    test("duration range", () =>
        t({
            minDurationSeconds: 0,
            maxDurationSeconds: 4000
        }))

    test("activityId + versionId", () => t({ activityId: 12, versionId: 1 }))

    test("complex", () =>
        t({
            completed: true,
            flawless: false,
            fresh: true,
            minDurationSeconds: 0,
            maxDurationSeconds: 4000,
            playerCount: 3,
            minSeason: 12,
            maxSeason: 20,
            minDate: new Date("2021-01-01"),
            maxDate: new Date("2022-12-5")
        }))
})

describe("instances 404", () => {
    test("returns 404 for player not found", async () => {
        const result = await playerInstancesRoute.$mock({
            params: { membershipId: "1" }
        })

        expectErr(result)
        if (result.type === "err") {
            expect(result.code).toBe(ErrorCode.PlayerNotFoundError)
        }
    })
})

describe("instances 403", () => {
    test("returns 403 for protected resource", async () => {
        const result = await playerInstancesRoute.$mock({
            params: { membershipId: instancesPrivateMembershipId }
        })

        expectErr(result)

        if (result.type === "err") {
            expect(result.code).toBe(ErrorCode.PlayerProtectedResourceError)
        }
    })
})
