import { expectErr, expectOk } from "@/lib/test-utils"
import { describe, expect, test } from "bun:test"
import { leaderboardIndividualPantheonRoute } from "./pantheon"

describe("pantheon leaderboard 200", () => {
    const t = async (
        params: { category: string; version: string },
        query?: { count?: number; search?: string; page?: number }
    ) => {
        const result = await leaderboardIndividualPantheonRoute.$mock({ params, query })

        expectOk(result)
        expect(result.parsed.entries.length).toBeGreaterThan(0)
    }

    test("clears", () =>
        t(
            {
                category: "freshClears",
                version: "atraks"
            },
            {
                count: 10,
                page: 6
            }
        ))

    test("score", () =>
        t(
            {
                category: "score",
                version: "oryx"
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
                version: "rhulk"
            },
            {
                count: 10,
                search: "4611686018488107374"
            }
        ))
})

describe("pantheon leaderboard 404", () => {
    test("player not found", async () => {
        const result = await leaderboardIndividualPantheonRoute.$mock({
            params: {
                category: "clears",
                version: "nezarec"
            },
            query: {
                count: 10,
                search: "123"
            }
        })

        expectErr(result)
    })

    test("version not found", async () => {
        const result = await leaderboardIndividualPantheonRoute.$mock({
            params: {
                category: "clears",
                version: "caretaker"
            },
            query: {
                count: 10,
                search: "123"
            }
        })

        expectErr(result)
    })
})
