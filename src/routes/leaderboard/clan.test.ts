import { assertClanLeaderboardPage } from "@/lib/leaderboard-test-assertions"
import { expectOk } from "@/lib/test-utils"
import { describe, test } from "bun:test"
import { clanLeaderboardRoute } from "./clan"

describe("clan leaderboard 200", () => {
    const t = async (query?: Record<string, unknown>) => {
        const result = await clanLeaderboardRoute.$mock({ query })

        expectOk(result)
        if (result.type === "ok") {
            const count = Number(query?.count ?? 50)
            assertClanLeaderboardPage(result.parsed, count)
        }
    }

    test("weighted contest ranking", () =>
        t({
            count: 61,
            page: 1,
            column: "weighted_contest_score"
        }))

    test("sherpas", () =>
        t({
            count: 14,
            page: 3,
            column: "sherpas"
        }))

    test("average_sherpas", () =>
        t({
            count: 27,
            page: 2,
            column: "average_sherpas"
        }))

    test("clears", () =>
        t({
            count: 10,
            page: 5,
            column: "clears"
        }))
})
