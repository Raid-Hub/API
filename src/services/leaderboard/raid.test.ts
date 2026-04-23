import {
    assertIndividualLeaderboardSlice,
    assertIndividualSearchIncludesMembership
} from "@/lib/leaderboard-test-assertions"
import { zIndividualLeaderboardEntry } from "@/schema/components/LeaderboardData"
import { zNaturalNumber } from "@/schema/output"
import {
    getIndividualRaidLeaderboard,
    searchIndividualRaidLeaderboard
} from "@/services/leaderboard/individual/raid"
import { describe, expect, test } from "bun:test"
import { z } from "zod"

describe("getIndividualRaidLeaderboard", () => {
    test("returns the correct shape", async () => {
        const skip = 904
        const take = 34
        const data = await getIndividualRaidLeaderboard({
            raidId: 3,
            skip,
            take,
            column: "clears"
        })
        const parsed = z.array(zIndividualLeaderboardEntry).parse(data)
        assertIndividualLeaderboardSlice(parsed, skip, take)
    })
})

describe("searchIndividualRaidLeaderboard", () => {
    test("returns the correct shape", async () => {
        const take = 10
        const data = await searchIndividualRaidLeaderboard({
            raidId: 9,
            take,
            column: "clears",
            membershipId: "4611686018488107374"
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
            assertIndividualSearchIncludesMembership(parsed.entries, "4611686018488107374")
        } else {
            expect(data).toBeNull()
        }
    })
})
