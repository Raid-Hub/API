import { zIndividualLeaderboardEntry } from "@/schema/components/LeaderboardData"
import { zNaturalNumber } from "@/schema/util"
import {
    getIndividualRaidLeaderboard,
    searchIndividualRaidLeaderboard
} from "@/services/leaderboard/individual/raid"
import { describe, expect, it } from "bun:test"
import { z } from "zod"

describe("getIndividualRaidLeaderboard", () => {
    it("returns the correct shape", async () => {
        const data = await getIndividualRaidLeaderboard({
            raidId: 3,
            skip: 904,
            take: 34,
            column: "clears"
        }).catch(console.error)

        const parsed = z.array(zIndividualLeaderboardEntry).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toHaveLength(0)
        } else {
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(parsed.success).toBe(true)
        }
    })
})

describe("searchIndividualRaidLeaderboard", () => {
    it("returns the correct shape", async () => {
        const data = await searchIndividualRaidLeaderboard({
            raidId: 9,
            take: 10,
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
            expect(parsed.error.errors).toHaveLength(0)
        } else {
            expect(parsed.data.entries.length).toBeGreaterThan(0)
            expect(parsed.success).toBe(true)
        }
    })
})
