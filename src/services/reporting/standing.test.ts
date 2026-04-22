import {
    zInstanceBlacklist,
    zInstanceFlag,
    zInstancePlayerStanding
} from "@/schema/components/InstanceStanding"
import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { getInstanceBlacklist, getInstanceFlags, getInstancePlayersStanding } from "./standing"

describe("getInstanceFlags", () => {
    test("returns the correct shape", async () => {
        const flags = await getInstanceFlags("16164441855")
        expect(flags.length).toBeGreaterThanOrEqual(0)

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
    test("returns the correct shape", async () => {
        const blacklist = await getInstanceBlacklist("14846106179")
        if (blacklist) {
            const parsed = zInstanceBlacklist.safeParse(blacklist)
            if (!parsed.success) {
                console.error(parsed.error.errors)
                expect(parsed.error.errors).toEqual([])
            } else {
                expect(parsed.success).toBe(true)
            }
        }
    })
})

describe("getInstancePlayersStanding", () => {
    test("returns the correct shape", async () => {
        const standing = await getInstancePlayersStanding("16164452822")
        expect(standing.length).toBeGreaterThanOrEqual(0)
        if (standing[0]) {
            expect(standing[0].flags.length).toBeGreaterThanOrEqual(0)
        }

        const parsed = z.array(zInstancePlayerStanding).safeParse(standing)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })

    test("returns the correct shape #2", async () => {
        const standing = await getInstancePlayersStanding("16327328028")
        expect(standing.length).toBeGreaterThanOrEqual(0)
        if (standing[1]) {
            expect(standing[1].blacklistedInstances.length).toBeGreaterThanOrEqual(0)
        }

        const parsed = z.array(zInstancePlayerStanding).safeParse(standing)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})
