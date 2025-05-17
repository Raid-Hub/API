import {
    getContestTeamLeaderboard,
    searchContestTeamLeaderboard
} from "@/data/leaderboard/team/contest"
import { zTeamLeaderboardEntry } from "@/schema/components/LeaderboardData"
import { zNaturalNumber } from "@/schema/util"
import { describe, expect, it } from "bun:test"
import { z } from "zod"

describe("getContestTeamLeaderboard", () => {
    it("returns the correct shape", async () => {
        const data = await getContestTeamLeaderboard({
            raidId: 5,
            skip: 76,
            take: 13
        }).catch(console.error)

        const parsed = z.array(zTeamLeaderboardEntry).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toHaveLength(0)
        } else {
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(parsed.success).toBe(true)
        }
    })
})

describe("searchContestTeamLeaderboard", () => {
    it("returns the correct shape", async () => {
        const data = await searchContestTeamLeaderboard({
            raidId: 6,
            take: 5,
            membershipId: "4611686018467284386"
        }).catch(console.error)

        const parsed = z
            .object({
                page: zNaturalNumber(),
                entries: z.array(zTeamLeaderboardEntry)
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
