import { zIndividualLeaderboardEntry } from "@/schema/components/LeaderboardData"
import { zNaturalNumber } from "@/schema/output"
import {
    getIndividualGlobalLeaderboard,
    searchIndividualGlobalLeaderboard
} from "@/services/leaderboard/individual/global"
import { describe, expect, test } from "bun:test"
import { z } from "zod"

describe("getIndividualGlobalLeaderboard", () => {
    test("returns the correct shape", async () => {
        const data = await getIndividualGlobalLeaderboard({
            skip: 24921,
            take: 27,
            category: "clears"
        }).catch(console.error)

        const parsed = z.array(zIndividualLeaderboardEntry).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(parsed.success).toBe(true)
        }
    })
})

describe("searchIndividualGlobalLeaderboard", () => {
    test("returns the correct shape", async () => {
        const data = await searchIndividualGlobalLeaderboard({
            take: 4,
            category: "clears",
            membershipId: "4611686018488107374"
        }).catch(console.error)

        const parsed = z
            .object({
                page: zNaturalNumber(),
                entries: z.array(zIndividualLeaderboardEntry)
            })
            .safeParse(data)
        if (!parsed.success) {
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.data.entries.length).toBeGreaterThan(0)
            expect(parsed.success).toBe(true)
        }
    })
})
