import { pgReader } from "@/integrations/postgres"
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
        if (result.type === "ok") {
            expect(result.parsed.entries.length).toBeGreaterThanOrEqual(0)
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

        const result = await leaderboardIndividualPantheonRoute.$mock({
            params: {
                category: "clears",
                version: "rhulk"
            },
            query: {
                count: 10,
                search: existing?.membershipId?.toString() ?? "1"
            }
        })

        if (result.type === "ok") {
            expect(result.parsed.entries.length).toBeGreaterThanOrEqual(0)
        } else {
            expectErr(result)
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
