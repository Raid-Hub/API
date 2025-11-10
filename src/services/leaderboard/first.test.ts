import { zTeamLeaderboardEntry } from "@/schema/components/LeaderboardData"
import { zNaturalNumber } from "@/schema/util"
import {
    getFirstTeamActivityVersionLeaderboard,
    searchFirstTeamActivityVersionLeaderboard
} from "@/services/leaderboard/team/first"
import { describe, expect, test } from "bun:test"
import { z } from "zod"

describe("getFirstTeamActivityVersionLeaderboard", () => {
    test("returns the correct shape", async () => {
        const data = await getFirstTeamActivityVersionLeaderboard({
            activityId: 3,
            versionId: 3,
            skip: 76,
            take: 13
        }).catch(console.error)

        const parsed = z.array(zTeamLeaderboardEntry).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(parsed.success).toBe(true)
        }
    })
})

describe("searchFirstTeamActivityVersionLeaderboard", () => {
    test("returns the correct shape", async () => {
        const data = await searchFirstTeamActivityVersionLeaderboard({
            activityId: 12,
            versionId: 4,
            take: 16,
            membershipId: "4611686018517984145"
        }).catch(console.error)

        const parsed = z
            .object({
                page: zNaturalNumber(),
                entries: z.array(zTeamLeaderboardEntry)
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
