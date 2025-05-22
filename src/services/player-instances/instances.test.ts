import { zInstanceWithPlayers } from "@/schema/components/InstanceWithPlayers"
import { describe, expect, it } from "bun:test"
import { z } from "zod"
import { getInstances } from "./instances"

describe("getInstances", () => {
    it("returns the correct shape", async () => {
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

    it("filters by activityId + versionId", async () => {
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

    it("filters by completed, fresh, and flawless status", async () => {
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

    it("filters by player count", async () => {
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

    it("filters by player count range", async () => {
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

    it("filters by date range", async () => {
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

    it("filters by season range", async () => {
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

    it("filters by season", async () => {
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

    it("filters by duration", async () => {
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
})
