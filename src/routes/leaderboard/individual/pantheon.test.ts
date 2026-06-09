import { pgReader } from "@/integrations/postgres"
import {
    assertIndividualLeaderboardPage,
    assertIndividualSearchIncludesMembership
} from "@/lib/leaderboard-test-assertions"
import { expectErr, expectOk } from "@/lib/test-utils"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { describe, expect, test } from "bun:test"
import { leaderboardIndividualPantheonRoute } from "./pantheon"

describe("pantheon leaderboard 200", () => {
    const t = async (
        params: { category: string; version: string },
        query?: { count?: number; search?: string; page?: number }
    ) => {
        const result = await leaderboardIndividualPantheonRoute.$mock({ params, query })

        expectOk(result)
        if (result.type === "ok") {
            assertIndividualLeaderboardPage(result.parsed)
        }
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

    test("search", async () => {
        const existing = await pgReader.queryRow<{ membershipId: bigint }>(
            `SELECT membership_id AS "membershipId"
            FROM leaderboard.individual_pantheon_version_leaderboard
            LIMIT 1`
        )

        if (existing) {
            const result = await leaderboardIndividualPantheonRoute.$mock({
                params: {
                    category: "clears",
                    version: "rhulk"
                },
                query: {
                    count: 10,
                    search: existing.membershipId.toString()
                }
            })
            expectOk(result)
            if (result.type === "ok" && result.parsed.type === "individual") {
                assertIndividualLeaderboardPage(result.parsed)
                assertIndividualSearchIncludesMembership(
                    result.parsed.entries,
                    existing.membershipId.toString()
                )
            }
        } else {
            const result = await leaderboardIndividualPantheonRoute.$mock({
                params: {
                    category: "clears",
                    version: "rhulk"
                },
                query: {
                    count: 10,
                    search: "123"
                }
            })
            expectErr(result)
            if (result.type === "err") {
                expect(result.code).toBe(ErrorCode.PlayerNotOnLeaderboardError)
            }
        }
    })
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
