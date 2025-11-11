import { describe, expect, test } from "bun:test"

import { generateJWT } from "@/auth/jwt"
import { expectErr, expectOk } from "@/lib/test-utils"
import { ErrorCode } from "@/schema/errors/ErrorCode"

import { playerInstancesRoute } from "./instances"

describe("instances 200", () => {
    const membershipId = "4611686018488107374"
    const token = generateJWT(
        {
            isAdmin: false,
            bungieMembershipId: "123",
            destinyMembershipIds: ["4611686018488107374"]
        },
        600
    )

    const t = async (query?: {
        activityId?: number
        versionId?: number
        season?: number
        completed?: boolean
        flawless?: boolean
        fresh?: boolean
        playerCount?: number
        minPlayerCount?: number
        maxPlayerCount?: number
        minDurationSeconds?: number
        maxDurationSeconds?: number
        minSeason?: number
        maxSeason?: number
        minDate?: Date
        maxDate?: Date
    }) => {
        const result = await playerInstancesRoute.$mock({
            params: { membershipId },
            query,
            headers: { authorization: `Bearer ${token}` }
        })

        expectOk(result)
        if (result.type === "ok") {
            expect(result.parsed.length).toBeGreaterThan(0)
        }
    }

    test("no filters", () => t())

    test("season", () =>
        t({
            season: 14
        }))

    test("completion status", () =>
        t({
            completed: true,
            flawless: false,
            fresh: true
        }))

    test("season range", () =>
        t({
            minSeason: 14,
            maxSeason: 20
        }))

    test("date range", () =>
        t({
            minDate: new Date("2021-01-01"),
            maxDate: new Date("2021-12-31")
        }))

    test("player count", () =>
        t({
            playerCount: 6
        }))

    test("player count range", () =>
        t({
            minPlayerCount: 2,
            maxPlayerCount: 4
        }))

    test("duration range", () =>
        t({
            minDurationSeconds: 0,
            maxDurationSeconds: 300
        }))

    test("activityId + versionId", () => t({ activityId: 12, versionId: 1 }))

    test("complex", () =>
        t({
            completed: true,
            flawless: false,
            fresh: true,
            minDurationSeconds: 400,
            maxDurationSeconds: 1542,
            playerCount: 6,
            minSeason: 12,
            maxSeason: 20,
            minDate: new Date("2021-01-01"),
            maxDate: new Date("2022-12-5")
        }))
})

describe("instances 404", () => {
    test("returns 404 for player not found", async () => {
        const result = await playerInstancesRoute.$mock({
            params: { membershipId: "4611686018488107373" }
        })

        expectErr(result)
        if (result.type === "err") {
            expect(result.code).toBe(ErrorCode.PlayerNotFoundError)
        }
    })
})

describe("instances 403", () => {
    test("returns 403 for protected resource", async () => {
        const result = await playerInstancesRoute.$mock({
            params: { membershipId: "4611686018488107374" }
        })

        expectErr(result)

        if (result.type === "err") {
            expect(result.code).toBe(ErrorCode.PlayerProtectedResourceError)
        }
    })
})
