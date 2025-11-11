import { zClanLeaderboardEntry } from "@/schema/components/Clan"
import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { getClanLeaderboard } from "./leaderboard"

describe("getClanLeaderboard", () => {
    test("returns the correct shape", async () => {
        const data = await getClanLeaderboard({
            skip: 0,
            take: 10,
            column: "weighted_contest_score"
        }).catch(console.error)

        const parsed = z.array(zClanLeaderboardEntry).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.data).toHaveLength(10)
        }
    })
})
