import {
    assertIndividualLeaderboardSlice,
    assertIndividualSearchIncludesMembership
} from "@/lib/leaderboard-test-assertions"
import { zIndividualLeaderboardEntry } from "@/schema/components/LeaderboardData"
import { zNaturalNumber } from "@/schema/output"
import {
    getIndividualGlobalLeaderboard,
    searchIndividualGlobalLeaderboard
} from "@/services/leaderboard/individual/global"
import { describe, expect, test } from "bun:test"
import { z } from "zod"

describe("getIndividualGlobalLeaderboard", () => {
    test("returns the correct shape", async () => {
        const skip = 24921
        const take = 27
        const data = await getIndividualGlobalLeaderboard({
            skip,
            take,
            category: "clears"
        })
        const parsed = z.array(zIndividualLeaderboardEntry).parse(data)
        assertIndividualLeaderboardSlice(parsed, skip, take)
    })
})

describe("searchIndividualGlobalLeaderboard", () => {
    test("returns the correct shape", async () => {
        const take = 4
        const data = await searchIndividualGlobalLeaderboard({
            take,
            category: "clears",
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
