import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { generateJWT } from "@/auth/jwt"
import { getFixturePool } from "@/lib/test-fixture-db"
import { expectErr, expectOk } from "@/lib/test-utils"
import { ErrorCode } from "@/schema/errors/ErrorCode"

import { playerTeammatesRoute } from "./teammates"

const fixtureDb = getFixturePool()
const teammatePlayerA = "4611686019000000430"
const teammatePlayerB = "4611686019000000431"
const teammatePrivate = "4611686019000000432"
const teammateInstanceId = "999000000430"

beforeAll(async () => {
    await fixtureDb.query(`DELETE FROM core.instance_player WHERE instance_id = $1::bigint`, [
        teammateInstanceId
    ])
    await fixtureDb.query(`DELETE FROM raw.pgcr WHERE instance_id = $1::bigint`, [
        teammateInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.instance WHERE instance_id = $1::bigint`, [
        teammateInstanceId
    ])
    await fixtureDb.query(
        `DELETE FROM core.player_stats WHERE membership_id IN ($1::bigint, $2::bigint, $3::bigint)`,
        [teammatePlayerA, teammatePlayerB, teammatePrivate]
    )
    await fixtureDb.query(
        `DELETE FROM core.player WHERE membership_id IN ($1::bigint, $2::bigint, $3::bigint)`,
        [teammatePlayerA, teammatePlayerB, teammatePrivate]
    )

    await fixtureDb.query(
        `INSERT INTO core.player (
            membership_id, membership_type, icon_path, display_name,
            bungie_global_display_name, bungie_global_display_name_code, last_seen, first_seen,
            clears, fresh_clears, sherpas, total_time_played_seconds, sum_of_best, wfr_score,
            cheat_level, is_private, is_whitelisted, updated_at
        ) VALUES
        ($1::bigint, 3, NULL, 'fixture_tm_a', 'fixture_tm_a', '0430', NOW(), NOW(), 2, 1, 0, 200, 200, 0, 0, false, false, NOW()),
        ($2::bigint, 3, NULL, 'fixture_tm_b', 'fixture_tm_b', '0431', NOW(), NOW(), 2, 1, 0, 200, 200, 0, 0, false, false, NOW()),
        ($3::bigint, 3, NULL, 'fixture_tm_priv', 'fixture_tm_priv', '0432', NOW(), NOW(), 0, 0, 0, 0, NULL, 0, 0, true, false, NOW())`,
        [teammatePlayerA, teammatePlayerB, teammatePrivate]
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
        [teammateInstanceId]
    )

    await fixtureDb.query(
        `INSERT INTO core.instance_player (
            instance_id, membership_id, completed, time_played_seconds, sherpas, is_first_clear
        ) VALUES
        ($1::bigint, $2::bigint, true, 600, 0, false),
        ($1::bigint, $3::bigint, true, 600, 0, false)`,
        [teammateInstanceId, teammatePlayerA, teammatePlayerB]
    )
})

afterAll(async () => {
    await fixtureDb.query(`DELETE FROM core.instance_player WHERE instance_id = $1::bigint`, [
        teammateInstanceId
    ])
    await fixtureDb.query(`DELETE FROM raw.pgcr WHERE instance_id = $1::bigint`, [
        teammateInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.instance WHERE instance_id = $1::bigint`, [
        teammateInstanceId
    ])
    await fixtureDb.query(
        `DELETE FROM core.player_stats WHERE membership_id IN ($1::bigint, $2::bigint, $3::bigint)`,
        [teammatePlayerA, teammatePlayerB, teammatePrivate]
    )
    await fixtureDb.query(
        `DELETE FROM core.player WHERE membership_id IN ($1::bigint, $2::bigint, $3::bigint)`,
        [teammatePlayerA, teammatePlayerB, teammatePrivate]
    )
})

describe("teammates 200", () => {
    test("returns teammates for valid player id", async () => {
        const result = await playerTeammatesRoute.$mock({
            params: { membershipId: teammatePlayerA }
        })

        expectOk(result)
        if (result.type === "ok") {
            expect(result.parsed.length).toBeGreaterThan(0)
            expect(
                result.parsed.some(t => String(t.playerInfo.membershipId) === teammatePlayerB)
            ).toBe(true)
        }
    })
})

describe("teammates 403", () => {
    test("returns 403 for private profile", async () => {
        const result = await playerTeammatesRoute.$mock({
            params: {
                membershipId: teammatePrivate
            }
        })

        expectErr(result)
        if (result.type === "err") {
            expect(result.code).toBe(ErrorCode.PlayerPrivateProfileError)
        }
    })
})

describe("teammates 404", () => {
    const t = async (membershipId: string) => {
        const result = await playerTeammatesRoute.$mock({
            params: {
                membershipId
            }
        })

        expectErr(result)
        if (result.type === "err") {
            expect(result.code).toBe(ErrorCode.PlayerNotFoundError)
        }
    }

    test("returns 404 for invalid player id", () => t("1"))
})

describe("teammates authorized", () => {
    test("returns ok for authorized private profile", async () => {
        const token = generateJWT(
            {
                isAdmin: false,
                bungieMembershipId: "123",
                destinyMembershipIds: [teammatePrivate]
            },
            600
        )

        const result = await playerTeammatesRoute.$mock({
            params: {
                membershipId: teammatePrivate
            },
            headers: {
                authorization: `Bearer ${token}`
            }
        })
        expectOk(result)
    })
})
