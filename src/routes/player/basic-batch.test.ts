import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { getFixturePool } from "@/lib/test-fixture-db"
import { expectOk } from "@/lib/test-utils"

import { playerBasicBatchRoute } from "./basic-batch"

const fixtureDb = getFixturePool()
const fixtureMembershipId = "4611686019000000402"

beforeAll(async () => {
    await fixtureDb.query(`DELETE FROM core.player_stats WHERE membership_id = $1::bigint`, [
        fixtureMembershipId
    ])
    await fixtureDb.query(`DELETE FROM core.player WHERE membership_id = $1::bigint`, [
        fixtureMembershipId
    ])
    await fixtureDb.query(
        `INSERT INTO core.player (
            membership_id, membership_type, icon_path, display_name,
            bungie_global_display_name, bungie_global_display_name_code, last_seen, first_seen,
            clears, fresh_clears, sherpas, total_time_played_seconds, sum_of_best, wfr_score,
            cheat_level, is_private, is_whitelisted, updated_at
        ) VALUES
        ($1::bigint, 3, NULL, 'fixture_basic_batch', 'fixture_basic_batch', '0402', NOW(), NOW(), 1, 1, 0, 100, 100, 0, 0, false, false, NOW())`,
        [fixtureMembershipId]
    )
})

afterAll(async () => {
    await fixtureDb.query(`DELETE FROM core.player_stats WHERE membership_id = $1::bigint`, [
        fixtureMembershipId
    ])
    await fixtureDb.query(`DELETE FROM core.player WHERE membership_id = $1::bigint`, [
        fixtureMembershipId
    ])
})

describe("player basic batch 200", () => {
    test("returns found players and omits unknown ids", async () => {
        const result = await playerBasicBatchRoute.$mock({
            body: {
                membershipIds: [fixtureMembershipId, "1"]
            }
        })

        const data = expectOk(result)
        expect(data.players).toHaveLength(1)
        expect(data.players[0]?.membershipId).toBe(fixtureMembershipId)
    })
})
