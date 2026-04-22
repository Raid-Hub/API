import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { Pool } from "pg"

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

const fixtureDb = new Pool({
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: "raidhub",
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.POSTGRES_PORT || 5432)
})

beforeAll(async () => {
    await fixtureDb.query(`DELETE FROM core.player WHERE membership_id IN ($1::bigint, $2::bigint)`, [
        publicMembershipId,
        privateMembershipId
    ])

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
})

afterAll(async () => {
    await fixtureDb.query(`DELETE FROM core.player WHERE membership_id IN ($1::bigint, $2::bigint)`, [
        publicMembershipId,
        privateMembershipId
    ])
    await fixtureDb.end()
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
