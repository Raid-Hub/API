import {
    assertIndividualLeaderboardSlice,
    assertTeamSearchIncludesMembership
} from "@/lib/leaderboard-test-assertions"
import { zTeamLeaderboardEntry } from "@/schema/components/LeaderboardData"
import { zNaturalNumber } from "@/schema/output"
import {
    getContestTeamLeaderboard,
    searchContestTeamLeaderboard
} from "@/services/leaderboard/team/contest"
import { describe, expect, test } from "bun:test"
import { z } from "zod"

describe("getContestTeamLeaderboard", () => {
    test("returns the correct shape", async () => {
        const skip = 76
        const take = 13
        const data = await getContestTeamLeaderboard({
            raidId: 5,
            skip,
            take
        })
        const parsed = z.array(zTeamLeaderboardEntry).parse(data)
        assertIndividualLeaderboardSlice(parsed, skip, take)
    })
})

describe("searchContestTeamLeaderboard", () => {
    test("returns the correct shape", async () => {
        const take = 5
        const searchMembershipId = "4611686018467284386"
        const data = await searchContestTeamLeaderboard({
            raidId: 6,
            take,
            membershipId: searchMembershipId
        })
        const parsed = z
            .object({
                page: zNaturalNumber(),
                entries: z.array(zTeamLeaderboardEntry)
            })
            .nullable()
            .parse(data)

        if (parsed) {
            const skip = (parsed.page - 1) * take
            assertIndividualLeaderboardSlice(parsed.entries, skip, take)
            assertTeamSearchIncludesMembership(parsed.entries, searchMembershipId)
        } else {
            expect(data).toBeNull()
        }
    })
})
