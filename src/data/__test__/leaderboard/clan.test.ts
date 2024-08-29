import { describe, expect, it } from "bun:test"
import { z } from "zod"
import { zClanLeaderboardEntry } from "../../../schema/components/Clan"
import { getClanLeaderboard } from "../../leaderboard/clan"

describe("getClanLeaderboard", () => {
    it("returns the correct shape", async () => {
        const data = await getClanLeaderboard({
            skip: 0,
            take: 10,
            column: "weighted_contest_score"
        }).catch(console.error)

        const parsed = z.array(zClanLeaderboardEntry).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toHaveLength(0)
        } else {
            expect(parsed.data).toHaveLength(10)
        }
    })
})
