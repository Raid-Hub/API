import { zIndividualLeaderboardEntry } from "@/schema/components/LeaderboardData"
import { zNaturalNumber } from "@/schema/util"
import {
    getIndividualWorldFirstPowerRankingsLeaderboard,
    searchIndividualWorldFirstPowerRankingsLeaderboard
} from "@/services/leaderboard/individual/power-rankings"
import { describe, expect, it } from "bun:test"
import { z } from "zod"

describe("getIndividualWorldFirstPowerRankingsLeaderboard", () => {
    it("returns the correct shape", async () => {
        const data = await getIndividualWorldFirstPowerRankingsLeaderboard({
            skip: 24921,
            take: 27
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

describe("searchIndividualWorldFirstPowerRankingsLeaderboard", () => {
    it("returns the correct shape", async () => {
        const data = await searchIndividualWorldFirstPowerRankingsLeaderboard({
            take: 4,
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
