import { getFixturePool } from "@/lib/test-fixture-db"
import { zPlayerInfo } from "@/schema/components/PlayerInfo"
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { z } from "zod"
import { searchForPlayer } from "./player-search"

const fixtureDb = getFixturePool()
const svcSearchMembershipId = "4611686019000000802"

beforeAll(async () => {
    await fixtureDb.query(`DELETE FROM core.player_stats WHERE membership_id = $1::bigint`, [
        svcSearchMembershipId
    ])
    await fixtureDb.query(`DELETE FROM core.player WHERE membership_id = $1::bigint`, [
        svcSearchMembershipId
    ])
    await fixtureDb.query(
        `INSERT INTO core.player (
            membership_id, membership_type, icon_path, display_name,
            bungie_global_display_name, bungie_global_display_name_code, last_seen, first_seen,
            clears, fresh_clears, sherpas, total_time_played_seconds, sum_of_best, wfr_score,
            cheat_level, is_private, is_whitelisted, updated_at
        ) VALUES
        ($1::bigint, 3, NULL, 'RhSvcSearchFixture', 'RhSvcSearchFixture', '7701', NOW(), NOW(), 1, 1, 0, 100, 100, 0, 0, false, false, NOW())`,
        [svcSearchMembershipId]
    )
})

afterAll(async () => {
    await fixtureDb.query(`DELETE FROM core.player_stats WHERE membership_id = $1::bigint`, [
        svcSearchMembershipId
    ])
    await fixtureDb.query(`DELETE FROM core.player WHERE membership_id = $1::bigint`, [
        svcSearchMembershipId
    ])
})

describe("searchForPlayer", () => {
    test("returns the correct shape", async () => {
        const data = await searchForPlayer("RhSvcSearchFixture", {
            count: 10,
            offset: 0,
            global: true
        }).catch(console.error)

        const parsed = z
            .object({
                searchTerm: z.literal("rhsvcsearchfixture"),
                results: z.array(zPlayerInfo)
            })
            .strict()
            .safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.data.results.length).toBeGreaterThan(0)
            expect(parsed.data.results[0].membershipId).toBe(BigInt(svcSearchMembershipId))
            expect(parsed.success).toBe(true)
        }
    })

    test("returns the correct shape with platform", async () => {
        const data = await searchForPlayer(" RhSvcSearchFixture", {
            count: 10,
            offset: 0,
            global: false,
            membershipType: 3
        }).catch(console.error)

        const parsed = z
            .object({
                searchTerm: z.literal("rhsvcsearchfixture"),
                results: z.array(zPlayerInfo)
            })
            .strict()
            .safeParse(data)
        if (!parsed.success) {
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.data.results.length).toBeGreaterThan(0)
            expect(parsed.data.results[0].membershipId).toBe(BigInt(svcSearchMembershipId))
            expect(parsed.success).toBe(true)
        }
    })
})
