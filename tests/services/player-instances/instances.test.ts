import { zInstanceWithPlayers } from "@/schema/components/InstanceWithPlayers"
import { getInstancePlayerInfo } from "@/services/instance/instance"
import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { getInstances } from "@/services/player-instances/instances"

describe("getInstances", () => {
    test("returns the correct shape", async () => {
        const data = await getInstances({
            membershipIds: ["4611686018488107374", "4611686018515944770"],
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
            membershipIds: ["4611686018488107374"],
            count: 10,
            activityId: 8,
            versionId: 1
        }).catch(console.error)

        const parsed = z.array(zInstanceWithPlayers).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(
                parsed.data.every(instance => instance.activityId === 8 && instance.versionId === 1)
            ).toBe(true)
        }
    })

    test("filters by completed, fresh, and flawless status", async () => {
        const data = await getInstances({
            membershipIds: ["4611686018488107374"],
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
        const playerCount = 6
        const data = await getInstances({
            membershipIds: ["4611686018488107374"],
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
            membershipIds: ["4611686018488107374"],
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
            membershipIds: ["4611686018488107374"],
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
        const minSeason = 10
        const maxSeason = 15
        const data = await getInstances({
            membershipIds: ["4611686018488107374"],
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
        const season = 12
        const data = await getInstances({
            membershipIds: ["4611686018488107374"],
            count: 10,
            season
        }).catch(console.error)

        const parsed = z.array(zInstanceWithPlayers).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
            expect(parsed.data.every(instance => instance.season == season)).toBe(true)
        }
    })

    test("filters by duration", async () => {
        const minDurationSeconds = 300
        const maxDurationSeconds = 600
        const data = await getInstances({
            membershipIds: ["4611686018488107374"],
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
        const players = await getInstancePlayerInfo("16707634209").catch(console.error)
        if (!players || players.length === 0) {
            console.error("No players found for instance 16707634209")
            return
        }

        const membershipIds = players.map(p => p.membershipId.toString())
        const data = await getInstances({
            membershipIds,
            count: 100
        }).catch(console.error)

        const parsed = z.array(zInstanceWithPlayers).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            const instance = parsed.data.find(i => i.instanceId === 16707634209n)
            if (instance) {
                expect(instance.isBlacklisted).toBe(false)
            }
            expect(parsed.success).toBe(true)
        }
    })
})
