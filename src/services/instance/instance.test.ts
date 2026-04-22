import { getFixturePool } from "@/lib/test-fixture-db"
import { zInstance } from "@/schema/components/Instance"
import { zInstanceExtended } from "@/schema/components/InstanceExtended"
import { zInstanceMetadata } from "@/schema/components/InstanceMetadata"
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { z } from "zod"
import {
    getInstance,
    getInstanceExtended,
    getInstanceMetadataByHash,
    getLeaderboardEntryForInstance
} from "./instance"

const fixtureDb = getFixturePool()
const fixtureInstanceId = "999000000701"
const fixtureMembershipId = "4611686019000000701"
let fixtureHashForMetadata: string

beforeAll(async () => {
    await fixtureDb.query(`DELETE FROM core.instance_player WHERE instance_id = $1::bigint`, [
        fixtureInstanceId
    ])
    await fixtureDb.query(
        `DELETE FROM flagging.flag_instance_player WHERE instance_id = $1::bigint`,
        [fixtureInstanceId]
    )
    await fixtureDb.query(
        `DELETE FROM flagging.blacklist_instance_player WHERE instance_id = $1::bigint`,
        [fixtureInstanceId]
    )
    await fixtureDb.query(
        `DELETE FROM flagging.blacklist_instance WHERE instance_id = $1::bigint`,
        [fixtureInstanceId]
    )
    await fixtureDb.query(`DELETE FROM flagging.flag_instance WHERE instance_id = $1::bigint`, [
        fixtureInstanceId
    ])
    await fixtureDb.query(`DELETE FROM raw.pgcr WHERE instance_id = $1::bigint`, [
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
        ($1::bigint, 3, NULL, 'fixture_instance_svc', 'fixture_instance_svc', '0701', NOW(), NOW(), 1, 1, 0, 100, 100, 0, 0, false, false, NOW())`,
        [fixtureMembershipId]
    )

    const ins = await fixtureDb.query<{ hash: string }>(
        `INSERT INTO core.instance (
            instance_id, hash, score, flawless, completed, fresh, player_count, date_started, date_completed, duration, platform_type, is_whitelisted, skull_hashes
        )
        SELECT
            $1::bigint, av.hash, 0, false, true, true, 1, NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '5 minutes', 600, 3, false, ARRAY[]::bigint[]
        FROM definitions.activity_version av
        ORDER BY av.hash
        LIMIT 1
        RETURNING hash::text AS "hash"`,
        [fixtureInstanceId]
    )
    fixtureHashForMetadata = ins.rows[0]!.hash

    await fixtureDb.query(
        `INSERT INTO core.instance_player (
            instance_id, membership_id, completed, time_played_seconds, sherpas, is_first_clear
        ) VALUES ($1::bigint, $2::bigint, true, 300, 0, false)`,
        [fixtureInstanceId, fixtureMembershipId]
    )
})

afterAll(async () => {
    await fixtureDb.query(`DELETE FROM core.instance_player WHERE instance_id = $1::bigint`, [
        fixtureInstanceId
    ])
    await fixtureDb.query(
        `DELETE FROM flagging.flag_instance_player WHERE instance_id = $1::bigint`,
        [fixtureInstanceId]
    )
    await fixtureDb.query(
        `DELETE FROM flagging.blacklist_instance_player WHERE instance_id = $1::bigint`,
        [fixtureInstanceId]
    )
    await fixtureDb.query(
        `DELETE FROM flagging.blacklist_instance WHERE instance_id = $1::bigint`,
        [fixtureInstanceId]
    )
    await fixtureDb.query(`DELETE FROM flagging.flag_instance WHERE instance_id = $1::bigint`, [
        fixtureInstanceId
    ])
    await fixtureDb.query(`DELETE FROM raw.pgcr WHERE instance_id = $1::bigint`, [
        fixtureInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.instance WHERE instance_id = $1::bigint`, [
        fixtureInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.player WHERE membership_id = $1::bigint`, [
        fixtureMembershipId
    ])
})

describe("getInstance", () => {
    test("returns the correct shape", async () => {
        const data = await getInstance(fixtureInstanceId).catch(console.error)

        const parsed = zInstance.safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
    describe("edge cases", () => {
        test("computed flags are booleans", async () => {
            const data = await getInstance(fixtureInstanceId).catch(console.error)
            const parsed = zInstance.safeParse(data)
            if (!parsed.success) {
                console.error(parsed.error.errors)
                expect(parsed.error.errors).toEqual([])
            } else {
                expect(typeof parsed.data.isContest).toBe("boolean")
                expect(typeof parsed.data.isDayOne).toBe("boolean")
                expect(typeof parsed.data.isWeekOne).toBe("boolean")
                expect(typeof parsed.data.isBlacklisted).toBe("boolean")
            }
        })
    })
})

describe("getInstanceExtended", () => {
    test("returns the correct shape", async () => {
        const data = await getInstanceExtended(fixtureInstanceId).catch(console.error)

        const parsed = zInstanceExtended.safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})

describe("getInstanceMetadataByHash", () => {
    test("returns the correct shape", async () => {
        const data = await getInstanceMetadataByHash(fixtureHashForMetadata).catch(console.error)

        const parsed = zInstanceMetadata.safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})

describe("getLeaderboardEntryForInstance", () => {
    test("returns the correct shape", async () => {
        const data = await getLeaderboardEntryForInstance(fixtureInstanceId).catch(console.error)

        const parsed = z
            .object({
                rank: z.number().int()
            })
            .nullable()
            .safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})
