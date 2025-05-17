import { expectErr, expectOk } from "@/test"
import { describe, expect, test } from "bun:test"
import { leaderboardIndividualRaidRoute } from "./raid"

describe("raid leaderboard 200", () => {
    const t = async (
        params: { category: string; raid: string },
        query?: { count?: number; search?: string; page?: number }
    ) => {
        const result = await leaderboardIndividualRaidRoute.$mock({ params, query })

        expectOk(result)
        expect(result.parsed.entries.length).toBeGreaterThan(0)
    }

    test("clears", () =>
        t(
            {
                category: "freshClears",
                raid: "vowofthedisciple"
            },
            {
                count: 10,
                page: 6
            }
        ))

    test("score", () =>
        t(
            {
                category: "sherpas",
                raid: "gardenofsalvation"
            },
            {
                count: 14,
                page: 4
            }
        ))

    test("search", () =>
        t(
            {
                category: "clears",
                raid: "leviathan"
            },
            {
                count: 10,
                search: "4611686018488107374"
            }
        ))
})

describe("raid leaderboard 404", () => {
    test("player not found", async () => {
        const result = await leaderboardIndividualRaidRoute.$mock({
            params: {
                category: "clears",
                raid: "crotasend"
            },
            query: {
                count: 10,
                search: "123"
            }
        })

        expectErr(result)
    })

    test("raid not found", async () => {
        const result = await leaderboardIndividualRaidRoute.$mock({
            params: {
                category: "clears",
                raid: "goofy"
            },
            query: {
                count: 10,
                search: "123"
            }
        })

        expectErr(result)
    })
})
