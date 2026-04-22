import { getFixturePool } from "@/lib/test-fixture-db"
import { zInstanceWithPlayers } from "@/schema/components/InstanceWithPlayers"
import { getInstancePlayerInfo } from "@/services/instance/instance"
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { z } from "zod"
import { getInstances } from "./instances"

const fixtureDb = getFixturePool()
const svcInstMembershipA = "4611686019000000705"
const svcInstMembershipB = "4611686019000000706"
const svcInstInstanceId = "999000000705"

let fixtureActivityId: number
let fixtureVersionId: number
let fixtureSeason: number

beforeAll(async () => {
    await fixtureDb.query(`DELETE FROM core.instance_player WHERE instance_id = $1::bigint`, [
        svcInstInstanceId
    ])
    await fixtureDb.query(
        `DELETE FROM flagging.flag_instance_player WHERE instance_id = $1::bigint`,
        [svcInstInstanceId]
    )
    await fixtureDb.query(
        `DELETE FROM flagging.blacklist_instance_player WHERE instance_id = $1::bigint`,
        [svcInstInstanceId]
    )
    await fixtureDb.query(
        `DELETE FROM flagging.blacklist_instance WHERE instance_id = $1::bigint`,
        [svcInstInstanceId]
    )
    await fixtureDb.query(`DELETE FROM flagging.flag_instance WHERE instance_id = $1::bigint`, [
        svcInstInstanceId
    ])
    await fixtureDb.query(`DELETE FROM raw.pgcr WHERE instance_id = $1::bigint`, [
        svcInstInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.instance WHERE instance_id = $1::bigint`, [
        svcInstInstanceId
    ])
    await fixtureDb.query(
        `DELETE FROM core.player_stats WHERE membership_id IN ($1::bigint, $2::bigint)`,
        [svcInstMembershipA, svcInstMembershipB]
    )
    await fixtureDb.query(
        `DELETE FROM core.player WHERE membership_id IN ($1::bigint, $2::bigint)`,
        [svcInstMembershipA, svcInstMembershipB]
    )

    await fixtureDb.query(
        `INSERT INTO core.player (
            membership_id, membership_type, icon_path, display_name,
            bungie_global_display_name, bungie_global_display_name_code, last_seen, first_seen,
            clears, fresh_clears, sherpas, total_time_played_seconds, sum_of_best, wfr_score,
            cheat_level, is_private, is_whitelisted, updated_at
        ) VALUES
        ($1::bigint, 3, NULL, 'fixture_svc_inst_a', 'fixture_svc_inst_a', '0705', NOW(), NOW(), 1, 1, 0, 100, 100, 0, 0, false, false, NOW()),
        ($2::bigint, 3, NULL, 'fixture_svc_inst_b', 'fixture_svc_inst_b', '0706', NOW(), NOW(), 1, 1, 0, 100, 100, 0, 0, false, false, NOW())`,
        [svcInstMembershipA, svcInstMembershipB]
    )

    await fixtureDb.query(
        `INSERT INTO core.instance (
            instance_id, hash, score, flawless, completed, fresh, player_count, date_started, date_completed, duration, platform_type, is_whitelisted, skull_hashes
        )
        SELECT
            $1::bigint, av.hash, 0, false, true, true, 3, TIMESTAMPTZ '2023-07-10 12:00:00Z', TIMESTAMPTZ '2023-07-10 14:00:00Z', 450, 3, false, ARRAY[]::bigint[]
        FROM definitions.activity_version av
        ORDER BY av.hash
        LIMIT 1`,
        [svcInstInstanceId]
    )

    await fixtureDb.query(
        `INSERT INTO core.instance_player (
            instance_id, membership_id, completed, time_played_seconds, sherpas, is_first_clear
        ) VALUES
        ($1::bigint, $2::bigint, true, 400, 0, false),
        ($1::bigint, $3::bigint, true, 400, 0, false)`,
        [svcInstInstanceId, svcInstMembershipA, svcInstMembershipB]
    )

    const meta = await fixtureDb.query<{ activityId: number; versionId: number; season: number }>(
        `SELECT av.activity_id::int AS "activityId", av.version_id::int AS "versionId", i.season_id::int AS "season"
        FROM core.instance i
        INNER JOIN definitions.activity_version av USING (hash)
        WHERE i.instance_id = $1::bigint`,
        [svcInstInstanceId]
    )
    const row = meta.rows[0]!
    fixtureActivityId = row.activityId
    fixtureVersionId = row.versionId
    fixtureSeason = row.season
})

afterAll(async () => {
    await fixtureDb.query(`DELETE FROM core.instance_player WHERE instance_id = $1::bigint`, [
        svcInstInstanceId
    ])
    await fixtureDb.query(
        `DELETE FROM flagging.flag_instance_player WHERE instance_id = $1::bigint`,
        [svcInstInstanceId]
    )
    await fixtureDb.query(
        `DELETE FROM flagging.blacklist_instance_player WHERE instance_id = $1::bigint`,
        [svcInstInstanceId]
    )
    await fixtureDb.query(
        `DELETE FROM flagging.blacklist_instance WHERE instance_id = $1::bigint`,
        [svcInstInstanceId]
    )
    await fixtureDb.query(`DELETE FROM flagging.flag_instance WHERE instance_id = $1::bigint`, [
        svcInstInstanceId
    ])
    await fixtureDb.query(`DELETE FROM raw.pgcr WHERE instance_id = $1::bigint`, [
        svcInstInstanceId
    ])
    await fixtureDb.query(`DELETE FROM core.instance WHERE instance_id = $1::bigint`, [
        svcInstInstanceId
    ])
    await fixtureDb.query(
        `DELETE FROM core.player_stats WHERE membership_id IN ($1::bigint, $2::bigint)`,
        [svcInstMembershipA, svcInstMembershipB]
    )
    await fixtureDb.query(
        `DELETE FROM core.player WHERE membership_id IN ($1::bigint, $2::bigint)`,
        [svcInstMembershipA, svcInstMembershipB]
    )
})

describe("getInstances", () => {
    test("returns the correct shape", async () => {
        const data = await getInstances({
            membershipIds: [svcInstMembershipA, svcInstMembershipB],
            count: 100
        }).catch(console.error)

        const parsed = z.array(zInstanceWithPlayers).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
            expect(parsed.data.length).toBeGreaterThan(0)
        }
    })

    test("filters by activityId + versionId", async () => {
        const data = await getInstances({
            membershipIds: [svcInstMembershipA],
            count: 10,
            activityId: fixtureActivityId,
            versionId: fixtureVersionId
        }).catch(console.error)

        const parsed = z.array(zInstanceWithPlayers).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(
                parsed.data.every(
                    instance =>
                        instance.activityId === fixtureActivityId &&
                        instance.versionId === fixtureVersionId
                )
            ).toBe(true)
        }
    })

    test("filters by completed, fresh, and flawless status", async () => {
        const data = await getInstances({
            membershipIds: [svcInstMembershipA],
            count: 25,
            completed: true,
            flawless: false,
            fresh: true
        }).catch(console.error)

        const parsed = z.array(zInstanceWithPlayers).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(
                parsed.data.every(
                    instance =>
                        instance.completed === true &&
                        instance.flawless === false &&
                        instance.fresh === true
                )
            ).toBeTrue()
        }
    })

    test("filters by player count", async () => {
        const playerCount = 3
        const data = await getInstances({
            membershipIds: [svcInstMembershipA],
            count: 10,
            playerCount
        }).catch(console.error)

        const parsed = z.array(zInstanceWithPlayers).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(parsed.data.every(instance => instance.playerCount === playerCount)).toBe(true)
        }
    })

    test("filters by player count range", async () => {
        const minPlayerCount = 2
        const maxPlayerCount = 4
        const data = await getInstances({
            membershipIds: [svcInstMembershipA],
            count: 10,
            minPlayerCount,
            maxPlayerCount
        }).catch(console.error)

        const parsed = z.array(zInstanceWithPlayers).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(
                parsed.data.every(
                    instance =>
                        instance.playerCount >= minPlayerCount &&
                        instance.playerCount <= maxPlayerCount
                )
            ).toBe(true)
        }
    })

    test("filters by date range", async () => {
        const minDate = new Date("2023-01-01")
        const maxDate = new Date("2023-12-31")
        const data = await getInstances({
            membershipIds: [svcInstMembershipA],
            count: 10,
            minDate,
            maxDate
        }).catch(console.error)

        const parsed = z.array(zInstanceWithPlayers).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(
                parsed.data.every(
                    instance =>
                        new Date(instance.dateStarted) >= minDate &&
                        new Date(instance.dateCompleted) <= maxDate
                )
            ).toBe(true)
        }
    })

    test("filters by season range", async () => {
        const minSeason = Math.max(0, fixtureSeason - 2)
        const maxSeason = fixtureSeason + 2
        const data = await getInstances({
            membershipIds: [svcInstMembershipA],
            count: 10,
            minSeason,
            maxSeason
        }).catch(console.error)

        const parsed = z.array(zInstanceWithPlayers).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(
                parsed.data.every(
                    instance => instance.season >= minSeason && instance.season <= maxSeason
                )
            ).toBe(true)
        }
    })

    test("filters by season", async () => {
        const data = await getInstances({
            membershipIds: [svcInstMembershipA],
            count: 10,
            season: fixtureSeason
        }).catch(console.error)

        const parsed = z.array(zInstanceWithPlayers).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(parsed.data.every(instance => instance.season === fixtureSeason)).toBe(true)
        }
    })

    test("filters by duration", async () => {
        const minDurationSeconds = 300
        const maxDurationSeconds = 600
        const data = await getInstances({
            membershipIds: [svcInstMembershipA],
            count: 10,
            minDurationSeconds,
            maxDurationSeconds
        }).catch(console.error)

        const parsed = z.array(zInstanceWithPlayers).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(
                parsed.data.every(
                    instance =>
                        instance.duration >= minDurationSeconds &&
                        instance.duration <= maxDurationSeconds
                )
            ).toBe(true)
        }
    })

    test("whitelisted instance is not blacklisted", async () => {
        const players = await getInstancePlayerInfo(svcInstInstanceId).catch(console.error)
        expect(players).not.toBeNull()
        expect(players!.length).toBeGreaterThan(0)

        const membershipIds = players!.map(p => p.membershipId.toString())
        const data = await getInstances({
            membershipIds,
            count: 100
        }).catch(console.error)

        const parsed = z.array(zInstanceWithPlayers).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            const instance = parsed.data.find(i => i.instanceId === BigInt(svcInstInstanceId))
            expect(instance).toBeDefined()
            expect(instance!.isBlacklisted).toBe(false)
            expect(parsed.success).toBe(true)
        }
    })
})
