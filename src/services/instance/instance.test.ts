import { zInstance } from "@/schema/components/Instance"
import { zInstanceExtended } from "@/schema/components/InstanceExtended"
import { zInstanceMetadata } from "@/schema/components/InstanceMetadata"
import { describe, expect, it } from "bun:test"
import { z } from "zod"
import {
    getInstance,
    getInstanceExtended,
    getInstanceMetadataByHash,
    getLeaderboardEntryForInstance
} from "./instance"

describe("getInstance", () => {
    it("returns the correct shape", async () => {
        const data = await getInstance("12685770593").catch(console.error)

        const parsed = zInstance.safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
    describe("edge cases", () => {
        it("is day one for day 1 clears on contest tdp", async () => {
            const data = await getInstance("16321449037").catch(console.error)
            const parsed = zInstance.safeParse(data)
            if (!parsed.success) {
                console.error(parsed.error.errors)
                expect(parsed.error.errors).toEqual([])
            } else {
                expect(parsed.success).toBe(true)
                expect(parsed.data.isContest).toBe(true)
                expect(parsed.data.isDayOne).toBe(true)
                expect(parsed.data.isWeekOne).toBe(true)
            }
        })

        it("is not contest or day one for day 1 clears on non-contest tdp", async () => {
            const data = await getInstance("16322031067").catch(console.error)

            const parsed = zInstance.safeParse(data)
            if (!parsed.success) {
                console.error(parsed.error.errors)
                expect(parsed.error.errors).toEqual([])
            } else {
                expect(parsed.success).toBe(true)
                expect(parsed.data.isContest).toBe(false)
                expect(parsed.data.isDayOne).toBe(false)
                expect(parsed.data.isWeekOne).toBe(true)
            }
        })

        it("is contest for day 1 non-challenge king's fall", async () => {
            const data = await getInstance("11395499732").catch(console.error)

            const parsed = zInstance.safeParse(data)
            if (!parsed.success) {
                console.error(parsed.error.errors)
                expect(parsed.error.errors).toEqual([])
            } else {
                expect(parsed.success).toBe(true)
                expect(parsed.data.isContest).toBe(true)
                expect(parsed.data.isDayOne).toBe(true)
                expect(parsed.data.isWeekOne).toBe(true)
            }
        })

        it("is not contest for day 1 levi", async () => {
            const data = await getInstance("258758374").catch(console.error)

            const parsed = zInstance.safeParse(data)
            if (!parsed.success) {
                console.error(parsed.error.errors)
                expect(parsed.error.errors).toEqual([])
            } else {
                expect(parsed.success).toBe(true)
                expect(parsed.data.isContest).toBe(false)
                expect(parsed.data.isDayOne).toBe(true)
                expect(parsed.data.isWeekOne).toBe(true)
            }
        })
    })
})

describe("getInstanceExtended", () => {
    it("returns the correct shape", async () => {
        const data = await getInstanceExtended("12685770593").catch(console.error)

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
    it("returns the correct shape", async () => {
        const data = await getInstanceMetadataByHash(3711931140).catch(console.error)

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
    it("returns the correct shape", async () => {
        const data = await getLeaderboardEntryForInstance("13779269605").catch(console.error)

        const parsed = z
            .object({
                rank: z.literal(14)
            })
            .safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})
