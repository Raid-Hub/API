import { expectErr, expectOk } from "@/test"
import { describe, expect, test } from "bun:test"
import { leaderboardTeamFirstActivityVersionRoute } from "./first"

describe("first leaderboard 200", () => {
    const t = async (
        params: { activity: string; version: string },
        query?: { count?: number; search?: string; page?: number }
    ) => {
        const result = await leaderboardTeamFirstActivityVersionRoute.$mock({ params, query })

        expectOk(result)
        expect(result.parsed.entries.length).toBeGreaterThan(0)
    }

    test("vow", () =>
        t(
            {
                activity: "vowofthedisciple",
                version: "master"
            },
            {
                count: 10,
                page: 1
            }
        ))

    test("levi", () =>
        t(
            {
                activity: "leviathan",
                version: "prestige"
            },
            {
                count: 14,
                page: 4
            }
        ))

    test("search", () =>
        t(
            {
                activity: "kingsfall",
                version: "normal"
            },
            {
                count: 10,
                search: "4611686018488107374"
            }
        ))
})

describe("first leaderboard 404", () => {
    test("player not found", async () => {
        const result = await leaderboardTeamFirstActivityVersionRoute.$mock({
            params: {
                activity: "rootofnightmares",
                version: "normal"
            },
            query: {
                count: 10,
                search: "123"
            }
        })

        expectErr(result)
    })

    test("invalid combo", async () => {
        const result = await leaderboardTeamFirstActivityVersionRoute.$mock({
            params: {
                activity: "spireofstars",
                version: "master"
            },
            query: {
                count: 10
            }
        })

        expectErr(result)
    })
})
