import { expectErr, expectOk } from "@/test"
import { describe, expect, test } from "bun:test"
import { leaderboardTeamContestRoute } from "./contest"

describe("contest leaderboard 200", () => {
    const t = async (
        params: { raid: string },
        query?: { count?: number; search?: string; page?: number }
    ) => {
        const result = await leaderboardTeamContestRoute.$mock({ params, query })

        expectOk(result)
        expect(result.parsed.entries.length).toBeGreaterThan(0)
    }

    test("vow", () =>
        t(
            {
                raid: "vowofthedisciple"
            },
            {
                count: 10,
                page: 1
            }
        ))

    test("levi", () =>
        t(
            {
                raid: "leviathan"
            },
            {
                count: 14,
                page: 4
            }
        ))

    test("search", () =>
        t(
            {
                raid: "kingsfall"
            },
            {
                count: 10,
                search: "4611686018488107374"
            }
        ))
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
