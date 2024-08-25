import { describe, expect, it } from "bun:test"
import { z } from "zod"
import { zIndividualLeaderboardEntry } from "../../../schema/components/LeaderboardData"
import { zNaturalNumber } from "../../../schema/util"
import {
    getIndividualGlobalLeaderboard,
    searchIndividualGlobalLeaderboard
} from "../../leaderboard/individual/global"

describe("getIndividualGlobalLeaderboard", () => {
    it("returns the correct shape", async () => {
        const data = await getIndividualGlobalLeaderboard({
            skip: 24921,
            take: 27,
            column: "clears"
        }).catch(console.error)

        const parsed = z.array(zIndividualLeaderboardEntry).safeParse(data)
        if (!parsed.success) {
            expect(parsed.error.errors).toHaveLength(0)
        } else {
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(parsed.success).toBe(true)
        }
    })
})

describe("searchIndividualGlobalLeaderboard", () => {
    it("returns the correct shape", async () => {
        const data = await searchIndividualGlobalLeaderboard({
            take: 4,
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
