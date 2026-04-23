import {
    assertIndividualLeaderboardPage,
    assertIndividualSearchIncludesMembership
} from "@/lib/leaderboard-test-assertions"
import { expectErr, expectOk } from "@/lib/test-utils"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { describe, expect, test } from "bun:test"
import { leaderboardIndividualGlobalRoute } from "./global"

describe("global leaderboard 200", () => {
    const t = async (
        params: { category: string },
        query?: { count?: number; search?: string; page?: number }
    ) => {
        const result = await leaderboardIndividualGlobalRoute.$mock({ params, query })

        return result
    }

    test("clears", async () => {
        const result = await t(
            {
                category: "clears"
            },
            {
                count: 10,
                page: 1
            }
        )
        expectOk(result)
        if (result.type === "ok") {
            assertIndividualLeaderboardPage(result.parsed)
        }
    })
    test("full clears", async () => {
        const result = await t(
            {
                category: "full-clears"
            },
            {
                count: 10,
                page: 1
            }
        )
        expectOk(result)
        if (result.type === "ok") {
            assertIndividualLeaderboardPage(result.parsed)
        }
    })

    test("sherpas", async () => {
        const result = await t(
            {
                category: "sherpas"
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

    test("in raid time", async () => {
        const result = await t(
            {
                category: "in-raid-time"
            },
            {
                count: 19,
                page: 7
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
                category: "clears"
            },
            {
                count: 10,
                search: "4611686018488107374"
            }
        )
        if (result.type === "ok") {
            assertIndividualLeaderboardPage(result.parsed)
            assertIndividualSearchIncludesMembership(result.parsed.entries, "4611686018488107374")
        } else {
            expect(result.code).toBe(ErrorCode.PlayerNotOnLeaderboardError)
        }
    })

    test("power rankings", async () => {
        const result = await t(
            {
                category: "world-first-rankings"
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

    test("search power rankings", async () => {
        const result = await t(
            {
                category: "world-first-rankings"
            },
            {
                count: 11,
                search: "4611686018488107374"
            }
        )
        if (result.type === "ok") {
            assertIndividualLeaderboardPage(result.parsed)
            assertIndividualSearchIncludesMembership(result.parsed.entries, "4611686018488107374")
        } else {
            expect(result.code).toBe(ErrorCode.PlayerNotOnLeaderboardError)
        }
    })
})

describe("global leaderboard 404", () => {
    test("player not found", async () => {
        const result = await leaderboardIndividualGlobalRoute.$mock({
            params: {
                category: "clears"
            },
            query: {
                count: 10,
                search: "123"
            }
        })

        expectErr(result)
    })
})
