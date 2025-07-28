import {
    zInstanceBlacklist,
    zInstanceFlag,
    zInstancePlayerStanding
} from "@/schema/components/InstanceStanding"
import { describe, expect, it } from "bun:test"
import { z } from "zod"
import { getInstanceBlacklist, getInstanceFlags, getInstancePlayersStanding } from "./standing"

describe("getInstanceFlags", () => {
    it("returns the correct shape", async () => {
        const flags = await getInstanceFlags("16164441855")
        expect(flags.length).toBeGreaterThan(0)

        const parsed = z.array(zInstanceFlag).safeParse(flags)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})

describe("getInstanceBlacklist", () => {
    it("returns the correct shape", async () => {
        const blacklist = await getInstanceBlacklist("14846106179")

        expect(blacklist).not.toBeNull()

        const parsed = zInstanceBlacklist.safeParse(blacklist)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})

describe("getInstancePlayersStanding", () => {
    it("returns the correct shape", async () => {
        const standing = await getInstancePlayersStanding("16164452822")
        expect(standing.length).toBe(1)
        expect(standing[0].playerInfo.membershipId).toBe("4611686018538460817")
        expect(standing[0].flags.length).toBeGreaterThan(0)

        const parsed = z.array(zInstancePlayerStanding).safeParse(standing)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })

    it("returns the correct shape #2", async () => {
        const standing = await getInstancePlayersStanding("16327328028")
        expect(standing.length).toBe(6)
        expect(standing[1].playerInfo.membershipId).toBe("4611686018470558748")
        expect(standing[1].blacklistedInstances.length).toBeGreaterThan(0)

        const parsed = z.array(zInstancePlayerStanding).safeParse(standing)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})
