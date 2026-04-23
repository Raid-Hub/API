import { getFixturePool } from "@/lib/test-fixture-db"
import { zInstanceForPlayer } from "@/schema/components/InstanceForPlayer"
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { z } from "zod"
import { getActivities } from "./history"

const fixtureDb = getFixturePool()
const historySvcMembershipId = "4611686019000000530"
const historySvcInstanceId = "999000000530"

beforeAll(async () => {
    await fixtureDb.query(`DELETE FROM core.instance_player WHERE instance_id = $1::bigint`, [
        historySvcInstanceId
    ])
    await fixtureDb.query(
        `DELETE FROM flagging.blacklist_instance WHERE instance_id = $1::bigint`,
        [historySvcInstanceId]
    )
    await fixtureDb.query(`DELETE FROM flagging.flag_instance WHERE instance_id = $1::bigint`, [
        historySvcInstanceId
    ])
    await fixtureDb.query(`DELETE FROM raw.pgcr WHERE instance_id = $1::bigint`, [
        historySvcInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.instance WHERE instance_id = $1::bigint`, [
        historySvcInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.player_stats WHERE membership_id = $1::bigint`, [
        historySvcMembershipId
    ])
    await fixtureDb.query(`DELETE FROM core.player WHERE membership_id = $1::bigint`, [
        historySvcMembershipId
    ])

    await fixtureDb.query(
        `INSERT INTO core.player (
            membership_id, membership_type, icon_path, display_name,
            bungie_global_display_name, bungie_global_display_name_code, last_seen, first_seen,
            clears, fresh_clears, sherpas, total_time_played_seconds, sum_of_best, wfr_score,
            cheat_level, is_private, is_whitelisted, updated_at
        ) VALUES
        ($1::bigint, 3, NULL, 'fixture_hist_svc', 'fixture_hist_svc', '0530', NOW(), NOW(), 2, 1, 0, 200, 200, 0, 0, false, false, NOW())`,
        [historySvcMembershipId]
    )

    await fixtureDb.query(
        `INSERT INTO core.instance (
            instance_id, hash, score, flawless, completed, fresh, player_count, date_started, date_completed, duration, platform_type, is_whitelisted, skull_hashes
        )
        SELECT
            $1::bigint, av.hash, 0, false, true, true, 1, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', 600, 3, false, ARRAY[]::bigint[]
        FROM definitions.activity_version av
        ORDER BY av.hash
        LIMIT 1`,
        [historySvcInstanceId]
    )

    await fixtureDb.query(
        `INSERT INTO core.instance_player (
            instance_id, membership_id, completed, time_played_seconds, sherpas, is_first_clear
        ) VALUES ($1::bigint, $2::bigint, true, 300, 0, false)`,
        [historySvcInstanceId, historySvcMembershipId]
    )
})

afterAll(async () => {
    await fixtureDb.query(`DELETE FROM core.instance_player WHERE instance_id = $1::bigint`, [
        historySvcInstanceId
    ])
    await fixtureDb.query(
        `DELETE FROM flagging.blacklist_instance WHERE instance_id = $1::bigint`,
        [historySvcInstanceId]
    )
    await fixtureDb.query(`DELETE FROM flagging.flag_instance WHERE instance_id = $1::bigint`, [
        historySvcInstanceId
    ])
    await fixtureDb.query(`DELETE FROM raw.pgcr WHERE instance_id = $1::bigint`, [
        historySvcInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.instance WHERE instance_id = $1::bigint`, [
        historySvcInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.player_stats WHERE membership_id = $1::bigint`, [
        historySvcMembershipId
    ])
    await fixtureDb.query(`DELETE FROM core.player WHERE membership_id = $1::bigint`, [
        historySvcMembershipId
    ])
})

describe("getActivities", () => {
    test("returns rows for fixture player without cursor", async () => {
        const data = await getActivities(historySvcMembershipId, {
            count: 10
        })
        const parsed = z.array(zInstanceForPlayer).parse(data)
        expect(parsed.length).toBeGreaterThan(0)
        expect(parsed.some(a => String(a.instanceId) === historySvcInstanceId)).toBe(true)
        expect(parsed.every(a => !a.isBlacklisted)).toBe(true)
    })

    test("respects cursor (future cursor includes fixture completion)", async () => {
        const data = await getActivities(historySvcMembershipId, {
            count: 10,
            cursor: new Date("2099-01-01T00:00:00Z")
        })
        const parsed = z.array(zInstanceForPlayer).parse(data)
        expect(parsed.length).toBeGreaterThan(0)
    })

    test("respects cutoff", async () => {
        const data = await getActivities(historySvcMembershipId, {
            count: 10,
            cutoff: new Date("2000-01-01T00:00:00Z")
        })
        const parsed = z.array(zInstanceForPlayer).parse(data)
        expect(parsed.length).toBeGreaterThan(0)
    })

    test("old cursor yields empty page when no completions before cursor", async () => {
        const data = await getActivities(historySvcMembershipId, {
            count: 10,
            cursor: new Date("2000-01-01T00:00:00Z")
        })
        const parsed = z.array(zInstanceForPlayer).parse(data)
        expect(parsed.length).toBe(0)
    })
})
