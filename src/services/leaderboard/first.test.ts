import {
    assertIndividualLeaderboardSlice,
    assertTeamSearchIncludesMembership
} from "@/lib/leaderboard-test-assertions"
import { zTeamLeaderboardEntry } from "@/schema/components/LeaderboardData"
import { zNaturalNumber } from "@/schema/output"
import {
    getFirstTeamActivityVersionLeaderboard,
    searchFirstTeamActivityVersionLeaderboard
} from "@/services/leaderboard/team/first"
import { describe, expect, test } from "bun:test"
import { z } from "zod"

describe("getFirstTeamActivityVersionLeaderboard", () => {
    test("returns the correct shape", async () => {
        const skip = 76
        const take = 13
        const data = await getFirstTeamActivityVersionLeaderboard({
            activityId: 3,
            versionId: 3,
            skip,
            take
        })
        const parsed = z.array(zTeamLeaderboardEntry).parse(data)
        assertIndividualLeaderboardSlice(parsed, skip, take)
    })
})

describe("searchFirstTeamActivityVersionLeaderboard", () => {
    test("returns the correct shape", async () => {
        const take = 16
        const searchMembershipId = "4611686018517984145"
        const data = await searchFirstTeamActivityVersionLeaderboard({
            activityId: 12,
            versionId: 4,
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
