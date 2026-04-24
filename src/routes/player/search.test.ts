import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { getFixturePool } from "@/lib/test-fixture-db"
import { expectOk } from "@/lib/test-utils"

import { playerSearchRoute } from "./search"

const fixtureDb = getFixturePool()
const searchFixtureMembershipId = "4611686019000000801"

beforeAll(async () => {
    await fixtureDb.query(`DELETE FROM core.player_stats WHERE membership_id = $1::bigint`, [
        searchFixtureMembershipId
    ])
    await fixtureDb.query(`DELETE FROM core.player WHERE membership_id = $1::bigint`, [
        searchFixtureMembershipId
    ])
    await fixtureDb.query(
        `INSERT INTO core.player (
            membership_id, membership_type, icon_path, display_name,
            bungie_global_display_name, bungie_global_display_name_code, last_seen, first_seen,
            clears, fresh_clears, sherpas, total_time_played_seconds, sum_of_best, wfr_score,
            cheat_level, is_private, is_whitelisted, updated_at
        ) VALUES
        ($1::bigint, 3, NULL, 'RhSearchRtFixture', 'RhSearchRtFixture', '8801', NOW(), NOW(), 1, 1, 0, 100, 100, 0, 0, false, false, NOW())`,
        [searchFixtureMembershipId]
    )
})

afterAll(async () => {
    await fixtureDb.query(`DELETE FROM core.player_stats WHERE membership_id = $1::bigint`, [
        searchFixtureMembershipId
    ])
    await fixtureDb.query(`DELETE FROM core.player WHERE membership_id = $1::bigint`, [
        searchFixtureMembershipId
    ])
})

describe("player search 200", () => {
    const t = async (query: unknown) => {
        const result = await playerSearchRoute.$mock({ query })

        expectOk(result)

        return result
    }

    test("partial display name", async () => {
        const data = await t({
            query: "RhSearchRtFix",
            count: 19,
            membershipType: -1,
            global: true
        })

        if (data.type === "ok") {
            expect(data.parsed.results.length).toBeGreaterThan(0)
            expect(
                data.parsed.results.some(r => r.membershipId === BigInt(searchFixtureMembershipId))
            ).toBe(true)
        }
    })

    test("display name", () =>
        t({
            query: "Newo",
            count: 3,
            membershipType: 2,
            global: false
        }))

    test("partial bungie name", () =>
        t({
            query: "Newo#90",
            global: true
        }))

    test("no raidhub results global", () =>
        t({
            query: "lafoasdfasmfahffjfa#9999",
            global: true
        }))

    test("no raidhub results display", () =>
        t({
            query: "lafoasdfasmfahffjfa",
            global: false
        }))

    test("full bungie name", async () => {
        const data = await t({
            query: "RhSearchRtFixture#8801",
            count: 23
        })

        if (data.type === "ok") {
            expect(data.parsed.results.length).toBeGreaterThan(0)
            expect(data.parsed.results[0].membershipId).toBe(BigInt(searchFixtureMembershipId))
        }
    })

    test("full bungie name wrong platform", async () => {
        const data = await t({
            query: "RhSearchRtFixture#8801",
            membershipType: 2,
            count: 1
        })

        if (data.type === "ok") {
            expect(data.parsed.results).toHaveLength(0)
        }
    })

    test("membership id", async () => {
        const data = await t({
            query: searchFixtureMembershipId
        })

        if (data.type === "ok") {
            expect(data.parsed.results.length).toBeGreaterThan(0)
            expect(data.parsed.results[0].membershipId).toBe(BigInt(searchFixtureMembershipId))
        }
    })
})
