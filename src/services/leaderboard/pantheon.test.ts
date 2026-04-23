import {
    assertIndividualLeaderboardSlice,
    assertIndividualSearchIncludesMembership
} from "@/lib/leaderboard-test-assertions"
import { zIndividualLeaderboardEntry } from "@/schema/components/LeaderboardData"
import { zNaturalNumber } from "@/schema/output"
import {
    getIndividualPantheonLeaderboard,
    searchIndividualPantheonLeaderboard
} from "@/services/leaderboard/individual/pantheon"
import { describe, expect, test } from "bun:test"
import { z } from "zod"

describe("getIndividualPantheonLeaderboard", () => {
    test("returns the correct shape", async () => {
        const skip = 13
        const take = 10
        const data = await getIndividualPantheonLeaderboard({
            versionId: 129,
            skip,
            take,
            column: "clears"
        })
        const parsed = z.array(zIndividualLeaderboardEntry).parse(data)
        assertIndividualLeaderboardSlice(parsed, skip, take)
    })
})

describe("searchIndividualPantheonLeaderboard", () => {
    test("returns the correct shape", async () => {
        const take = 15
        const searchMembershipId = "4611686018488107374"
        const data = await searchIndividualPantheonLeaderboard({
            versionId: 129,
            take,
            column: "clears",
            membershipId: searchMembershipId
        })
        const parsed = z
            .object({
                page: zNaturalNumber(),
                entries: z.array(zIndividualLeaderboardEntry)
            })
            .nullable()
            .parse(data)

        if (parsed) {
            const skip = (parsed.page - 1) * take
            assertIndividualLeaderboardSlice(parsed.entries, skip, take)
            assertIndividualSearchIncludesMembership(parsed.entries, searchMembershipId)
        } else {
            expect(data).toBeNull()
        }
    })
})
