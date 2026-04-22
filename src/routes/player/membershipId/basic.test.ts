import { afterAll, beforeAll, describe, test } from "bun:test"

import { getFixturePool } from "@/lib/test-fixture-db"
import { expectErr, expectOk } from "@/lib/test-utils"

import { playerBasicRoute } from "./basic"

const fixtureDb = getFixturePool()
const fixtureMembershipId = "4611686019000000401"

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
        ($1::bigint, 3, NULL, 'fixture_basic_route', 'fixture_basic_route', '0401', NOW(), NOW(), 1, 1, 0, 100, 100, 0, 0, false, false, NOW())`,
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

describe("player basic 200", () => {
    const t = async (membershipId: string) => {
        const result = await playerBasicRoute.$mock({ params: { membershipId } })

        expectOk(result)
    }

    test("returns basic info for valid player id", () => t(fixtureMembershipId))
})

describe("player basic 404", () => {
    const t = async (membershipId: string) => {
        const result = await playerBasicRoute.$mock({
            params: {
                membershipId
            }
        })

        expectErr(result)
    }

    test("returns 404 for invalid player id", () => t("1"))
})
