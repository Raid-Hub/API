import {
    assertIndividualLeaderboardSlice,
    assertTeamSearchIncludesMembership
} from "@/lib/leaderboard-test-assertions"
import { zTeamLeaderboardEntry } from "@/schema/components/LeaderboardData"
import { zNaturalNumber } from "@/schema/output"
import {
    getPantheonCustomRaceTeamLeaderboard,
    searchPantheonCustomRaceTeamLeaderboard
} from "@/services/leaderboard/team/custom"
import { describe, expect, test } from "bun:test"
import { z } from "zod"

describe("getPantheonCustomRaceTeamLeaderboard", () => {
    test("returns the correct shape", async () => {
        const skip = 0
        const take = 10
        const data = await getPantheonCustomRaceTeamLeaderboard({
            skip,
            take
        })
        const parsed = z.array(zTeamLeaderboardEntry).parse(data)
        assertIndividualLeaderboardSlice(parsed, skip, take)
    })
})

describe("searchPantheonCustomRaceTeamLeaderboard", () => {
    test("returns the correct shape", async () => {
        const take = 10
        const searchMembershipId = "4611686018488107374"
        const data = await searchPantheonCustomRaceTeamLeaderboard({
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
