import {
    assertTeamLeaderboardPage,
    assertTeamSearchIncludesMembership,
    isPantheonCustomRaceLeaderboardAvailable
} from "@/lib/leaderboard-test-assertions"
import { expectErr, expectOk } from "@/lib/test-utils"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { beforeAll, describe, expect, test } from "bun:test"
import { leaderboardTeamCustomRoute } from "./custom"

let hasCustomRaceLeaderboard = false

beforeAll(async () => {
    hasCustomRaceLeaderboard = await isPantheonCustomRaceLeaderboardAvailable()
})

describe("custom pantheon race leaderboard 200", () => {
    const t = async (query?: { count?: number; search?: string; page?: number }) => {
        const result = await leaderboardTeamCustomRoute.$mock({ query })

        return result
    }

    test("pantheon-community-race", async () => {
        if (!hasCustomRaceLeaderboard) return

        const result = await t({
            count: 10,
            page: 1
        })
        expectOk(result)
        if (result.type === "ok") {
            assertTeamLeaderboardPage(result.parsed)
        }
    })

    test("search", async () => {
        if (!hasCustomRaceLeaderboard) return

        const result = await t({
            count: 10,
            search: "4611686018488107374"
        })
        if (result.type === "ok" && result.parsed.type === "team") {
            assertTeamLeaderboardPage(result.parsed)
            assertTeamSearchIncludesMembership(result.parsed.entries, "4611686018488107374")
        } else if (result.type === "err") {
            expect(result.code).toBe(ErrorCode.PlayerNotOnLeaderboardError)
        }
    })
})

describe("custom pantheon race leaderboard 404", () => {
    test("player not found", async () => {
        if (!hasCustomRaceLeaderboard) return

        const result = await leaderboardTeamCustomRoute.$mock({
            query: {
                count: 10,
                search: "123"
            }
        })

        expectErr(result)
    })
})
