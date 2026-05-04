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
const fixtureCharacterId = "999070199901"
let fixtureHashForMetadata: string

beforeAll(async () => {
    await fixtureDb.query(
        `DELETE FROM extended.instance_character_weapon WHERE instance_id = $1::bigint`,
        [fixtureInstanceId]
    )
    await fixtureDb.query(
        `DELETE FROM extended.instance_character WHERE instance_id = $1::bigint`,
        [fixtureInstanceId]
    )
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
    fixtureHashForMetadata = ins.rows[0].hash

    await fixtureDb.query(
        `INSERT INTO core.instance_player (
            instance_id, membership_id, completed, time_played_seconds, sherpas, is_first_clear
        ) VALUES ($1::bigint, $2::bigint, true, 300, 0, false)`,
        [fixtureInstanceId, fixtureMembershipId]
    )

    await fixtureDb.query(
        `INSERT INTO extended.instance_character (
            instance_id, membership_id, character_id, class_hash, emblem_hash, completed,
            score, kills, assists, deaths, precision_kills, super_kills, grenade_kills, melee_kills,
            time_played_seconds, start_seconds
        ) VALUES ($1::bigint, $2::bigint, $3::bigint, 1, 1, true, 0, 0, 0, 0, 0, 0, 0, 0, 300, 0)`,
        [fixtureInstanceId, fixtureMembershipId, fixtureCharacterId]
    )
})

afterAll(async () => {
    await fixtureDb.query(
        `DELETE FROM extended.instance_character_weapon WHERE instance_id = $1::bigint`,
        [fixtureInstanceId]
    )
    await fixtureDb.query(
        `DELETE FROM extended.instance_character WHERE instance_id = $1::bigint`,
        [fixtureInstanceId]
    )
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

/** Same timing window as public PGCR [16326292274](https://raidhub.io/pgcr/16326292274): Standard clear during Desert Perpetual contest. */
const DP_PGCR_EXAMPLE_COMPLETED_AT = "2025-07-21T01:16:02.000Z"
const INSTANCE_DP_STANDARD = "999000000801"
const INSTANCE_DP_CONTEST = "999000000802"
const INSTANCE_VOW_STANDARD = "999000000803"
const PUBLIC_DP_PGCR_INSTANCE_ID = "16326292274"

describe("getInstance isContest (Desert Perpetual / pgcr 16326292274)", () => {
    let dpStandardHash: string | null = null
    let dpContestHash: string | null = null
    let vowStandardHash: string | null = null

    beforeAll(async () => {
        const [dpStd, dpCst, vowStd] = await Promise.all([
            fixtureDb.query<{ h: string }>(
                `SELECT hash::text AS h FROM definitions.activity_version WHERE activity_id = 15 AND version_id = 1 LIMIT 1`
            ),
            fixtureDb.query<{ h: string }>(
                `SELECT hash::text AS h FROM definitions.activity_version WHERE activity_id = 15 AND version_id = 32 LIMIT 1`
            ),
            fixtureDb.query<{ h: string }>(
                `SELECT hash::text AS h FROM definitions.activity_version WHERE activity_id = 10 AND version_id = 1 LIMIT 1`
            )
        ])
        dpStandardHash = dpStd.rows[0]?.h ?? null
        dpContestHash = dpCst.rows[0]?.h ?? null
        vowStandardHash = vowStd.rows[0]?.h ?? null

        if (!dpStandardHash || !dpContestHash) {
            return
        }

        for (const id of [INSTANCE_DP_STANDARD, INSTANCE_DP_CONTEST, INSTANCE_VOW_STANDARD]) {
            await fixtureDb.query(`DELETE FROM core.instance WHERE instance_id = $1::bigint`, [id])
        }

        await fixtureDb.query(
            `INSERT INTO core.instance (
                instance_id, hash, score, flawless, completed, fresh, player_count,
                date_started, date_completed, duration, platform_type, is_whitelisted, skull_hashes
            ) VALUES
            ($1::bigint, $2::bigint, 0, false, true, true, 6, $5::timestamptz, $5::timestamptz, 732, 3, false, ARRAY[]::bigint[]),
            ($3::bigint, $4::bigint, 0, false, true, true, 6, $5::timestamptz, $5::timestamptz, 732, 3, false, ARRAY[]::bigint[])`,
            [
                INSTANCE_DP_STANDARD,
                dpStandardHash,
                INSTANCE_DP_CONTEST,
                dpContestHash,
                DP_PGCR_EXAMPLE_COMPLETED_AT
            ]
        )

        if (vowStandardHash) {
            await fixtureDb.query(
                `INSERT INTO core.instance (
                    instance_id, hash, score, flawless, completed, fresh, player_count,
                    date_started, date_completed, duration, platform_type, is_whitelisted, skull_hashes
                ) VALUES (
                    $1::bigint, $2::bigint, 0, false, true, true, 6,
                    '2022-03-06T12:00:00Z'::timestamptz, '2022-03-06T12:30:00Z'::timestamptz, 1800, 3, false, ARRAY[]::bigint[]
                )`,
                [INSTANCE_VOW_STANDARD, vowStandardHash]
            )
        }
    })

    afterAll(async () => {
        for (const id of [INSTANCE_DP_STANDARD, INSTANCE_DP_CONTEST, INSTANCE_VOW_STANDARD]) {
            await fixtureDb.query(`DELETE FROM core.instance WHERE instance_id = $1::bigint`, [id])
        }
    })

    test("Desert Perpetual Standard during contest window → isContest false (pgcr 16326292274 scenario)", async () => {
        if (!dpStandardHash || !dpContestHash) {
            throw new Error(
                "Missing definitions.activity_version for Desert Perpetual (activity_id 15) versions 1 and 32 — run Services migrations + seeds."
            )
        }
        const row = await getInstance(INSTANCE_DP_STANDARD)
        expect(row).not.toBeNull()
        expect(row!.activityId).toBe(15)
        expect(row!.versionId).toBe(1)
        expect(row!.isContest).toBe(false)
    })

    test("Desert Perpetual contest hash during contest window → isContest true", async () => {
        if (!dpStandardHash || !dpContestHash) {
            throw new Error(
                "Missing definitions.activity_version for Desert Perpetual (activity_id 15) versions 1 and 32 — run Services migrations + seeds."
            )
        }
        const row = await getInstance(INSTANCE_DP_CONTEST)
        expect(row).not.toBeNull()
        expect(row!.activityId).toBe(15)
        expect(row!.versionId).toBe(32)
        expect(row!.isContest).toBe(true)
    })

    test("legacy raid (no version 32 row): Standard before contest_end → isContest true", async () => {
        if (!vowStandardHash) {
            throw new Error(
                "Missing definitions.activity_version for Vow (activity_id 10) version 1 — run Services migrations + seeds."
            )
        }
        const row = await getInstance(INSTANCE_VOW_STANDARD)
        expect(row).not.toBeNull()
        expect(row!.activityId).toBe(10)
        expect(row!.versionId).toBe(1)
        expect(row!.isContest).toBe(true)
    })

    test("optional: public PGCR 16326292274 row when present in DB", async () => {
        const row = await getInstance(PUBLIC_DP_PGCR_INSTANCE_ID)
        if (row === null) {
            return
        }
        expect(row.activityId).toBe(15)
        expect(row.versionId).toBe(1)
        expect(row.isContest).toBe(false)
    })
})
