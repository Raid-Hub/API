import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { getFixturePool } from "@/lib/test-fixture-db"
import { zPlayerInfo } from "@/schema/components/PlayerInfo"
import {
    zPlayerProfileActivityStats,
    zPlayerProfileGlobalStats,
    zWorldFirstEntry
} from "@/schema/components/PlayerProfile"

import { z } from "zod"

import {
    getPlayer,
    getPlayerActivityStats,
    getPlayerGlobalStats,
    getWorldFirstEntries
} from "./player"

const publicMembershipId = "4611686019000000001"
const privateMembershipId = "4611686019000000002"

const fixtureDb = getFixturePool()

beforeAll(async () => {
    await fixtureDb.query(
        `DELETE FROM core.player_stats WHERE membership_id IN ($1::bigint, $2::bigint)`,
        [publicMembershipId, privateMembershipId]
    )
    await fixtureDb.query(
        `DELETE FROM core.player WHERE membership_id IN ($1::bigint, $2::bigint)`,
        [publicMembershipId, privateMembershipId]
    )

    await fixtureDb.query(
        `INSERT INTO core.player (
            membership_id,
            membership_type,
            icon_path,
            display_name,
            bungie_global_display_name,
            bungie_global_display_name_code,
            last_seen,
            first_seen,
            clears,
            fresh_clears,
            sherpas,
            total_time_played_seconds,
            sum_of_best,
            wfr_score,
            cheat_level,
            is_private,
            is_whitelisted,
            updated_at
        ) VALUES
        ($1::bigint, 3, NULL, 'fixture_public', 'fixture_public', '0001', NOW(), NOW(), 1, 1, 0, 100, 100, 0, 0, false, false, NOW()),
        ($2::bigint, 3, NULL, 'fixture_private', 'fixture_private', '0002', NOW(), NOW(), 0, 0, 0, 0, NULL, 0, 0, true, false, NOW())`,
        [publicMembershipId, privateMembershipId]
    )

    await fixtureDb.query(
        `INSERT INTO core.player_stats (
            membership_id, activity_id, clears, fresh_clears, sherpas, total_time_played_seconds
        )
        SELECT $1::bigint, id, 2, 1, 0, 500
        FROM definitions.activity_definition
        ORDER BY id
        LIMIT 1
        ON CONFLICT (membership_id, activity_id) DO UPDATE SET
            clears = EXCLUDED.clears,
            fresh_clears = EXCLUDED.fresh_clears,
            sherpas = EXCLUDED.sherpas,
            total_time_played_seconds = EXCLUDED.total_time_played_seconds`,
        [publicMembershipId]
    )
})

afterAll(async () => {
    await fixtureDb.query(
        `DELETE FROM core.player_stats WHERE membership_id IN ($1::bigint, $2::bigint)`,
        [publicMembershipId, privateMembershipId]
    )
    await fixtureDb.query(
        `DELETE FROM core.player WHERE membership_id IN ($1::bigint, $2::bigint)`,
        [publicMembershipId, privateMembershipId]
    )
})

describe("getPlayer", () => {
    test("returns the correct shape", async () => {
        const data = await getPlayer(publicMembershipId).catch(console.error)

        const parsed = zPlayerInfo.safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})

describe("getPlayerActivityStats", () => {
    test("returns the correct shape", async () => {
        const data = await getPlayerActivityStats(publicMembershipId).catch(console.error)

        const parsed = z.array(zPlayerProfileActivityStats).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(parsed.success).toBe(true)
        }
    })
})

describe("getPlayerGlobalStats", () => {
    test("returns the correct shape", async () => {
        const data = await getPlayerGlobalStats(publicMembershipId).catch(console.error)

        const parsed = zPlayerProfileGlobalStats.safeParse(data)
        if (!parsed.success) {
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })

    test("returns the correct shape for a private profile", async () => {
        const data = await getPlayerGlobalStats(privateMembershipId).catch(console.error)

        const parsed = zPlayerProfileGlobalStats.safeParse(data)
        if (!parsed.success) {
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})

describe("getWorldFirstEntries", () => {
    test("returns the correct shape", async () => {
        const data = await getWorldFirstEntries(publicMembershipId).catch(console.error)

        const parsed = z.array(zWorldFirstEntry).safeParse(data)
        if (!parsed.success) {
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})
