import { getFixturePool } from "@/lib/test-fixture-db"
import { expectErr, expectOk } from "@/lib/test-utils"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { reportingStandingInstanceRoute } from "./instance-standing"

const fixtureInstanceId = "999000000101"
const fixtureMembershipId = "4611686019000000201"

const fixtureDb = getFixturePool()

beforeAll(async () => {
    await fixtureDb.query(`DELETE FROM raw.pgcr WHERE instance_id = $1::bigint`, [
        fixtureInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.instance_player WHERE instance_id = $1::bigint`, [
        fixtureInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.instance WHERE instance_id = $1::bigint`, [
        fixtureInstanceId
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
        ($1::bigint, 3, NULL, 'fixture_instance_standing', 'fixture_instance_standing', '0201', NOW(), NOW(), 1, 1, 0, 600, 600, 0, 0, false, false, NOW())`,
        [fixtureMembershipId]
    )

    await fixtureDb.query(
        `INSERT INTO core.instance (
            instance_id, hash, score, flawless, completed, fresh, player_count, date_started, date_completed, duration, platform_type, is_whitelisted, skull_hashes
        )
        SELECT
            $1::bigint, av.hash, 0, false, true, true, 1, NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '5 minutes', 300, 3, false, ARRAY[]::bigint[]
        FROM definitions.activity_version av
        ORDER BY av.hash
        LIMIT 1`,
        [fixtureInstanceId]
    )

    await fixtureDb.query(
        `INSERT INTO core.instance_player (
            instance_id, membership_id, completed, time_played_seconds, sherpas, is_first_clear
        ) VALUES ($1::bigint, $2::bigint, true, 300, 0, false)`,
        [fixtureInstanceId, fixtureMembershipId]
    )

    await fixtureDb.query(
        `INSERT INTO raw.pgcr (instance_id, data, date_crawled) VALUES ($1::bigint, $2, NOW())`,
        [fixtureInstanceId, Buffer.from("{}")]
    )
})

afterAll(async () => {
    await fixtureDb.query(`DELETE FROM raw.pgcr WHERE instance_id = $1::bigint`, [
        fixtureInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.instance_player WHERE instance_id = $1::bigint`, [
        fixtureInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.instance WHERE instance_id = $1::bigint`, [
        fixtureInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.player WHERE membership_id = $1::bigint`, [
        fixtureMembershipId
    ])
})

describe("instance standing 200", () => {
    const t = async (instanceId: string) => {
        const result = await reportingStandingInstanceRoute.$mock({ params: { instanceId } })

        expectOk(result)
    }

    test("normal", () => t(fixtureInstanceId))
})

describe("instance standing not found", () => {
    const t = async (instanceId: string) => {
        const result = await reportingStandingInstanceRoute.$mock({
            params: {
                instanceId
            }
        })

        expectErr(result)
        if (result.type === "err") {
            expect(result.code).toBe(ErrorCode.InstanceNotFoundError)
        }
    }

    test("fake id", () => t("1006164452822"))
})
