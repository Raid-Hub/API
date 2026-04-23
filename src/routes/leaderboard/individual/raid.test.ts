import {
    assertIndividualLeaderboardPage,
    assertIndividualSearchIncludesMembership
} from "@/lib/leaderboard-test-assertions"
import { expectErr, expectOk } from "@/lib/test-utils"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { describe, expect, test } from "bun:test"
import { leaderboardIndividualRaidRoute } from "./raid"

describe("raid leaderboard 200", () => {
    const t = async (
        params: { category: string; raid: string },
        query?: { count?: number; search?: string; page?: number }
    ) => {
        const result = await leaderboardIndividualRaidRoute.$mock({ params, query })

        return result
    }

    test("clears", async () => {
        const result = await t(
            {
                category: "freshClears",
                raid: "vowofthedisciple"
            },
            {
                count: 10,
                page: 6
            }
        )
        expectOk(result)
        if (result.type === "ok") {
            assertIndividualLeaderboardPage(result.parsed)
        }
    })

    test("score", async () => {
        const result = await t(
            {
                category: "sherpas",
                raid: "gardenofsalvation"
            },
            {
                count: 14,
                page: 4
            }
        )
        expectOk(result)
        if (result.type === "ok") {
            assertIndividualLeaderboardPage(result.parsed)
        }
    })

    test("search", async () => {
        const result = await t(
            {
                category: "clears",
                raid: "leviathan"
            },
            {
                count: 10,
                search: "4611686018488107374"
            }
        )
        if (result.type === "ok" && result.parsed.type === "individual") {
            assertIndividualLeaderboardPage(result.parsed)
            assertIndividualSearchIncludesMembership(result.parsed.entries, "4611686018488107374")
        } else if (result.type === "err") {
            expect(result.code).toBe(ErrorCode.PlayerNotOnLeaderboardError)
        }
    })
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
