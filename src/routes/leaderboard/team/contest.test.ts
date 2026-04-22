import { expectErr, expectOk } from "@/lib/test-utils"
import { describe, expect, test } from "bun:test"
import { leaderboardTeamContestRoute } from "./contest"

describe("contest leaderboard 200", () => {
    const t = async (
        params: { raid: string },
        query?: { count?: number; search?: string; page?: number }
    ) => {
        const result = await leaderboardTeamContestRoute.$mock({ params, query })

        return result
    }

    test("vow", async () => {
        const result = await t(
            {
                raid: "vowofthedisciple"
            },
            {
                count: 10,
                page: 1
            }
        )
        expectOk(result)
        if (result.type === "ok") expect(result.parsed.entries.length).toBeGreaterThanOrEqual(0)
    })

    test("levi", async () => {
        const result = await t(
            {
                raid: "leviathan"
            },
            {
                count: 14,
                page: 4
            }
        )
        expectOk(result)
        if (result.type === "ok") expect(result.parsed.entries.length).toBeGreaterThanOrEqual(0)
    })

    test("search", async () => {
        const result = await t(
            {
                raid: "kingsfall"
            },
            {
                count: 10,
                search: "4611686018488107374"
            }
        )
        if (result.type === "ok") {
            expect(result.parsed.entries.length).toBeGreaterThanOrEqual(0)
        } else {
            expectErr(result)
        }
    })
})

describe("contest leaderboard 404", () => {
    test("player not found", async () => {
        const result = await leaderboardTeamContestRoute.$mock({
            params: {
                raid: "rootofnightmares"
            },
            query: {
                count: 10,
                search: "123"
            }
        })

        expectErr(result)
    })

    test("raid not found", async () => {
        const result = await leaderboardTeamContestRoute.$mock({
            params: {
                raid: "goofy"
            },
            query: {
                count: 10
            }
        })

        expectErr(result)
    })
})
