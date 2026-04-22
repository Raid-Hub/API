import { getFixturePool } from "@/lib/test-fixture-db"
import {
    zInstanceBlacklist,
    zInstanceFlag,
    zInstancePlayerStanding
} from "@/schema/components/InstanceStanding"
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { z } from "zod"
import { getInstanceBlacklist, getInstanceFlags, getInstancePlayersStanding } from "./standing"

const fixtureDb = getFixturePool()
const standingInstanceId = "999000000801"
const standingMembershipId = "4611686019000000803"

beforeAll(async () => {
    await fixtureDb.query(
        `DELETE FROM flagging.flag_instance_player WHERE instance_id = $1::bigint`,
        [standingInstanceId]
    )
    await fixtureDb.query(
        `DELETE FROM flagging.blacklist_instance_player WHERE instance_id = $1::bigint`,
        [standingInstanceId]
    )
    await fixtureDb.query(
        `DELETE FROM flagging.blacklist_instance WHERE instance_id = $1::bigint`,
        [standingInstanceId]
    )
    await fixtureDb.query(`DELETE FROM flagging.flag_instance WHERE instance_id = $1::bigint`, [
        standingInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.instance_player WHERE instance_id = $1::bigint`, [
        standingInstanceId
    ])
    await fixtureDb.query(`DELETE FROM raw.pgcr WHERE instance_id = $1::bigint`, [
        standingInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.instance WHERE instance_id = $1::bigint`, [
        standingInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.player_stats WHERE membership_id = $1::bigint`, [
        standingMembershipId
    ])
    await fixtureDb.query(`DELETE FROM core.player WHERE membership_id = $1::bigint`, [
        standingMembershipId
    ])

    await fixtureDb.query(
        `INSERT INTO core.player (
            membership_id, membership_type, icon_path, display_name,
            bungie_global_display_name, bungie_global_display_name_code, last_seen, first_seen,
            clears, fresh_clears, sherpas, total_time_played_seconds, sum_of_best, wfr_score,
            cheat_level, is_private, is_whitelisted, updated_at
        ) VALUES
        ($1::bigint, 3, NULL, 'fixture_standing', 'fixture_standing', '0803', NOW(), NOW(), 1, 1, 0, 100, 100, 0, 0, false, false, NOW())`,
        [standingMembershipId]
    )

    await fixtureDb.query(
        `INSERT INTO core.instance (
            instance_id, hash, score, flawless, completed, fresh, player_count, date_started, date_completed, duration, platform_type, is_whitelisted, skull_hashes
        )
        SELECT
            $1::bigint, av.hash, 0, false, true, true, 1, NOW() - INTERVAL '1 day', NOW() - INTERVAL '12 hours', 600, 3, false, ARRAY[]::bigint[]
        FROM definitions.activity_version av
        ORDER BY av.hash
        LIMIT 1`,
        [standingInstanceId]
    )

    await fixtureDb.query(
        `INSERT INTO core.instance_player (
            instance_id, membership_id, completed, time_played_seconds, sherpas, is_first_clear
        ) VALUES ($1::bigint, $2::bigint, true, 300, 0, false)`,
        [standingInstanceId, standingMembershipId]
    )

    await fixtureDb.query(
        `INSERT INTO flagging.flag_instance (
            instance_id, cheat_check_version, cheat_check_bitmask, cheat_probability
        ) VALUES ($1::bigint, 'test-version', 0, 0.1)`,
        [standingInstanceId]
    )

    await fixtureDb.query(
        `INSERT INTO flagging.blacklist_instance (
            instance_id, report_source, report_id, cheat_check_version, reason
        ) VALUES ($1::bigint, 'Manual'::flagging."BlacklistReportSource", NULL, NULL, 'fixture blacklist')`,
        [standingInstanceId]
    )
})

afterAll(async () => {
    await fixtureDb.query(
        `DELETE FROM flagging.flag_instance_player WHERE instance_id = $1::bigint`,
        [standingInstanceId]
    )
    await fixtureDb.query(
        `DELETE FROM flagging.blacklist_instance_player WHERE instance_id = $1::bigint`,
        [standingInstanceId]
    )
    await fixtureDb.query(
        `DELETE FROM flagging.blacklist_instance WHERE instance_id = $1::bigint`,
        [standingInstanceId]
    )
    await fixtureDb.query(`DELETE FROM flagging.flag_instance WHERE instance_id = $1::bigint`, [
        standingInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.instance_player WHERE instance_id = $1::bigint`, [
        standingInstanceId
    ])
    await fixtureDb.query(`DELETE FROM raw.pgcr WHERE instance_id = $1::bigint`, [
        standingInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.instance WHERE instance_id = $1::bigint`, [
        standingInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.player_stats WHERE membership_id = $1::bigint`, [
        standingMembershipId
    ])
    await fixtureDb.query(`DELETE FROM core.player WHERE membership_id = $1::bigint`, [
        standingMembershipId
    ])
})

describe("getInstanceFlags", () => {
    test("returns the correct shape", async () => {
        const flags = await getInstanceFlags(standingInstanceId)
        expect(flags.length).toBeGreaterThan(0)

        const parsed = z.array(zInstanceFlag).safeParse(flags)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})

describe("getInstanceBlacklist", () => {
    test("returns the correct shape", async () => {
        const blacklist = await getInstanceBlacklist(standingInstanceId)

        expect(blacklist).not.toBeNull()

        const parsed = zInstanceBlacklist.safeParse(blacklist)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})

describe("getInstancePlayersStanding", () => {
    test("returns the correct shape", async () => {
        const standing = await getInstancePlayersStanding(standingInstanceId)
        expect(standing.length).toBe(1)
        expect(standing[0]!.playerInfo.membershipId).toBe(BigInt(standingMembershipId))
        expect(standing[0]!.flags.length).toBeGreaterThanOrEqual(0)

        const parsed = z.array(zInstancePlayerStanding).safeParse(standing)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })

    test("returns the correct shape #2", async () => {
        const standing = await getInstancePlayersStanding(standingInstanceId)
        expect(standing.length).toBe(1)
        expect(standing[0]!.blacklistedInstances.length).toBeGreaterThanOrEqual(0)

        const parsed = z.array(zInstancePlayerStanding).safeParse(standing)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})
