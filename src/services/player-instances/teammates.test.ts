import { getFixturePool } from "@/lib/test-fixture-db"
import { zTeammate } from "@/schema/components/Teammate"
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { z } from "zod"
import { getTeammates } from "./teammates"

const fixtureDb = getFixturePool()
const teammateSvcA = "4611686019000000540"
const teammateSvcB = "4611686019000000541"
const teammateSvcInstanceId = "999000000540"

beforeAll(async () => {
    await fixtureDb.query(`DELETE FROM core.instance_player WHERE instance_id = $1::bigint`, [
        teammateSvcInstanceId
    ])
    await fixtureDb.query(`DELETE FROM raw.pgcr WHERE instance_id = $1::bigint`, [
        teammateSvcInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.instance WHERE instance_id = $1::bigint`, [
        teammateSvcInstanceId
    ])
    await fixtureDb.query(
        `DELETE FROM core.player_stats WHERE membership_id IN ($1::bigint, $2::bigint)`,
        [teammateSvcA, teammateSvcB]
    )
    await fixtureDb.query(
        `DELETE FROM core.player WHERE membership_id IN ($1::bigint, $2::bigint)`,
        [teammateSvcA, teammateSvcB]
    )

    await fixtureDb.query(
        `INSERT INTO core.player (
            membership_id, membership_type, icon_path, display_name,
            bungie_global_display_name, bungie_global_display_name_code, last_seen, first_seen,
            clears, fresh_clears, sherpas, total_time_played_seconds, sum_of_best, wfr_score,
            cheat_level, is_private, is_whitelisted, updated_at
        ) VALUES
        ($1::bigint, 3, NULL, 'fixture_tm_svc_a', 'fixture_tm_svc_a', '0540', NOW(), NOW(), 2, 1, 0, 200, 200, 0, 0, false, false, NOW()),
        ($2::bigint, 3, NULL, 'fixture_tm_svc_b', 'fixture_tm_svc_b', '0541', NOW(), NOW(), 2, 1, 0, 200, 200, 0, 0, false, false, NOW())`,
        [teammateSvcA, teammateSvcB]
    )

    await fixtureDb.query(
        `INSERT INTO core.instance (
            instance_id, hash, score, flawless, completed, fresh, player_count, date_started, date_completed, duration, platform_type, is_whitelisted, skull_hashes
        )
        SELECT
            $1::bigint, av.hash, 0, false, true, true, 2, NOW() - INTERVAL '1 day', NOW() - INTERVAL '20 hours', 800, 3, false, ARRAY[]::bigint[]
        FROM definitions.activity_version av
        ORDER BY av.hash
        LIMIT 1`,
        [teammateSvcInstanceId]
    )

    await fixtureDb.query(
        `INSERT INTO core.instance_player (
            instance_id, membership_id, completed, time_played_seconds, sherpas, is_first_clear
        ) VALUES
        ($1::bigint, $2::bigint, true, 600, 0, false),
        ($1::bigint, $3::bigint, true, 600, 0, false)`,
        [teammateSvcInstanceId, teammateSvcA, teammateSvcB]
    )
})

afterAll(async () => {
    await fixtureDb.query(`DELETE FROM core.instance_player WHERE instance_id = $1::bigint`, [
        teammateSvcInstanceId
    ])
    await fixtureDb.query(`DELETE FROM raw.pgcr WHERE instance_id = $1::bigint`, [
        teammateSvcInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.instance WHERE instance_id = $1::bigint`, [
        teammateSvcInstanceId
    ])
    await fixtureDb.query(
        `DELETE FROM core.player_stats WHERE membership_id IN ($1::bigint, $2::bigint)`,
        [teammateSvcA, teammateSvcB]
    )
    await fixtureDb.query(
        `DELETE FROM core.player WHERE membership_id IN ($1::bigint, $2::bigint)`,
        [teammateSvcA, teammateSvcB]
    )
})

describe("getTeammates", () => {
    test("returns teammate row for fixture co-player", async () => {
        const data = await getTeammates(teammateSvcA, { count: 10 })
        const parsed = z.array(zTeammate).parse(data)
        expect(parsed.length).toBeGreaterThan(0)
        expect(parsed.some(t => String(t.playerInfo.membershipId) === teammateSvcB)).toBe(true)
    })
})
