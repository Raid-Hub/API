import { expectErr, expectOk } from "@/lib/test-utils"
import { describe, expect, test } from "bun:test"
import { leaderboardTeamFirstActivityVersionRoute } from "./first"

describe("first leaderboard 200", () => {
    const t = async (
        params: { activity: string; version: string },
        query?: { count?: number; search?: string; page?: number }
    ) => {
        const result = await leaderboardTeamFirstActivityVersionRoute.$mock({ params, query })

        return result
    }

    test("vow", async () => {
        const result = await t(
            {
                activity: "vowofthedisciple",
                version: "master"
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
                activity: "leviathan",
                version: "prestige"
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
                activity: "kingsfall",
                version: "normal"
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
