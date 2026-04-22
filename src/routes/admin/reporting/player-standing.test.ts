import { getFixturePool } from "@/lib/test-fixture-db"
import { expectErr, expectOk } from "@/lib/test-utils"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { getPlayerStanding } from "./player-standing"

const fixtureMembershipId = "4611686019000000301"

const fixtureDb = getFixturePool()

beforeAll(async () => {
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
        ($1::bigint, 3, NULL, 'fixture_player_standing', 'fixture_player_standing', '0301', NOW(), NOW(), 0, 0, 0, 0, NULL, 0, 0, false, false, NOW())`,
        [fixtureMembershipId]
    )
})

afterAll(async () => {
    await fixtureDb.query(`DELETE FROM core.player WHERE membership_id = $1::bigint`, [
        fixtureMembershipId
    ])
})

describe("player standing 200", () => {
    const t = async (membershipId: string) => {
        const result = await getPlayerStanding.$mock({ params: { membershipId } })

        expectOk(result)
    }

    test("normal", () => t(fixtureMembershipId))
})

describe("player standing not found", () => {
    const t = async (membershipId: string) => {
        const result = await getPlayerStanding.$mock({
            params: {
                membershipId
            }
        })

        expectErr(result)
        if (result.type === "err") {
            expect(result.code).toBe(ErrorCode.PlayerNotFoundError)
        }
    }

    test("fake id", () => t("1111111111111111111"))
})
