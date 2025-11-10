import { zIndividualLeaderboardEntry } from "@/schema/components/LeaderboardData"
import { zNaturalNumber } from "@/schema/util"
import {
    getIndividualPantheonLeaderboard,
    searchIndividualPantheonLeaderboard
} from "@/services/leaderboard/individual/pantheon"
import { describe, expect, test } from "bun:test"
import { z } from "zod"

describe("getIndividualPantheonLeaderboard", () => {
    test("returns the correct shape", async () => {
        const data = await getIndividualPantheonLeaderboard({
            versionId: 129,
            skip: 13,
            take: 10,
            column: "clears"
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

describe("searchIndividualPantheonLeaderboard", () => {
    test("returns the correct shape", async () => {
        const data = await searchIndividualPantheonLeaderboard({
            versionId: 129,
            take: 15,
            column: "clears",
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
