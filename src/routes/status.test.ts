import { afterAll, beforeEach, describe, expect, spyOn, test } from "bun:test"
import { Pool } from "pg"

import { expectOk } from "@/lib/test-utils"
import * as AtlasModule from "@/services/atlas"
import * as FloodgateModule from "@/services/floodgates"

import * as BungieCoreEndpoints from "bungie-net-core/endpoints/Core"
import { BungieNetResponse } from "bungie-net-core/interfaces"
import { CoreSettingsConfiguration } from "bungie-net-core/models"

import { statusRoute, statusState } from "./status"

const fixtureInstanceId = 999000000001n
const fixturePgcrData = Buffer.from("{}")

const fixtureDb = new Pool({
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: "raidhub",
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.POSTGRES_PORT || 5432)
})

describe("status 200", async () => {
    const spyGetAtlasStatus = spyOn(AtlasModule, "getAtlasStatus")
    const spyGetCommonSettings = spyOn(BungieCoreEndpoints, "getCommonSettings")
    const spyGetFloodgatesRecentId = spyOn(FloodgateModule, "getFloodgatesRecentId")
    const spyGetFloodgatesStatus = spyOn(FloodgateModule, "getFloodgatesStatus")

    beforeEach(async () => {
        spyGetAtlasStatus.mockReset()
        spyGetCommonSettings.mockReset()
        spyGetFloodgatesRecentId.mockReset()
        spyGetFloodgatesStatus.mockReset()

        spyGetCommonSettings.mockResolvedValueOnce({
            Response: {
                systems: {
                    Destiny2: {
                        enabled: true
                    }
                }
            }
        } as unknown as BungieNetResponse<CoreSettingsConfiguration>)

        await fixtureDb.query("DELETE FROM raw.pgcr WHERE instance_id = $1", [fixtureInstanceId.toString()])
        await fixtureDb.query("DELETE FROM core.instance WHERE instance_id = $1", [
            fixtureInstanceId.toString()
        ])

        await fixtureDb.query(
            `INSERT INTO core.instance (
                instance_id,
                hash,
                score,
                flawless,
                completed,
                fresh,
                player_count,
                date_started,
                date_completed,
                duration,
                platform_type,
                is_whitelisted
            )
            SELECT
                $1::bigint,
                av.hash,
                0,
                false,
                true,
                true,
                6,
                NOW() - INTERVAL '20 minutes',
                NOW() - INTERVAL '10 minutes',
                600,
                3,
                false
            FROM definitions.activity_version av
            ORDER BY av.hash
            LIMIT 1`,
            [fixtureInstanceId.toString()]
        )

        await fixtureDb.query(
            "INSERT INTO raw.pgcr (instance_id, data, date_crawled) VALUES ($1, $2, NOW())",
            [fixtureInstanceId.toString(), fixturePgcrData]
        )
    })

    afterAll(async () => {
        spyGetAtlasStatus.mockRestore()
        spyGetCommonSettings.mockRestore()
        spyGetFloodgatesRecentId.mockRestore()
        spyGetFloodgatesStatus.mockRestore()
        await fixtureDb.query("DELETE FROM raw.pgcr WHERE instance_id = $1", [fixtureInstanceId.toString()])
        await fixtureDb.query("DELETE FROM core.instance WHERE instance_id = $1", [
            fixtureInstanceId.toString()
        ])
        await fixtureDb.end()
    })

    const t = async () => {
        const result = await statusRoute.$mock()
        expectOk(result)

        if (result.type !== "ok") {
            throw new Error("Expected 200 response")
        }

        return result.parsed
    }

    describe("atlas", () => {
        beforeEach(() => {
            spyGetFloodgatesRecentId.mockResolvedValueOnce(null)
            spyGetFloodgatesStatus.mockResolvedValueOnce({
                waiting: 0,
                ackRateSeconds: 0,
                ingressRateSeconds: 0
            })
        })

        test("atlas crawling", async () => {
            statusState.isDestinyApiEnabled = true
            spyGetAtlasStatus.mockResolvedValueOnce({
                isCrawling: true,
                lag: 32,
                estimatedCatchUpTime: 0
            })
            const data = await t()
            expect(data.AtlasPGCR.status).toBe("Crawling")
        })

        test("atlas offline", async () => {
            statusState.isDestinyApiEnabled = true
            spyGetAtlasStatus.mockResolvedValueOnce({
                isCrawling: false,
                lag: null
            })
            const data = await t()
            expect(data.AtlasPGCR.status).toBe("Offline")
        })

        test("atlas idle", async () => {
            statusState.isDestinyApiEnabled = false
            spyGetAtlasStatus.mockResolvedValueOnce({
                isCrawling: false,
                lag: null
            })
            const data = await t()
            expect(data.AtlasPGCR.status).toBe("Idle")
        })
    })

    describe("floodgates", () => {
        beforeEach(() => {
            spyGetAtlasStatus.mockResolvedValueOnce({
                isCrawling: true,
                lag: 32,
                estimatedCatchUpTime: 0
            })
        })

        test("floodgates crawling", async () => {
            spyGetAtlasStatus.mockResolvedValueOnce({
                isCrawling: true,
                lag: 32,
                estimatedCatchUpTime: 0
            })

            spyGetFloodgatesRecentId.mockResolvedValueOnce(fixtureInstanceId.toString())

            spyGetFloodgatesStatus.mockResolvedValueOnce({
                waiting: 1000,
                ackRateSeconds: 6.9,
                ingressRateSeconds: 1.0
            })
            const data = await t()

            expect(data.FloodgatesPGCR.status).toBe("Crawling")
        })

        test("floodgates closed", async () => {
            spyGetFloodgatesRecentId.mockResolvedValueOnce(null)

            spyGetFloodgatesStatus.mockResolvedValueOnce({
                waiting: 15421,
                ackRateSeconds: 0,
                ingressRateSeconds: 2.6
            })
            const data = await t()

            expect(data.FloodgatesPGCR.status).toBe("Blocked")
        })

        test("floodgates empty", async () => {
            spyGetFloodgatesRecentId.mockResolvedValueOnce(null)

            spyGetFloodgatesStatus.mockResolvedValueOnce({
                waiting: 0,
                ackRateSeconds: 0,
                ingressRateSeconds: 0
            })
            const data = await t()

            expect(data.FloodgatesPGCR.status).toBe("Empty")
        })

        test("floodgates caught up", async () => {
            spyGetFloodgatesRecentId.mockResolvedValueOnce(fixtureInstanceId.toString())

            spyGetFloodgatesStatus.mockResolvedValueOnce({
                waiting: 2,
                ackRateSeconds: 2.5,
                ingressRateSeconds: 2.1
            })
            const data = await t()

            expect(data.FloodgatesPGCR.status).toBe("Live")
        })
    })
})

describe("status state machine", async () => {
    statusState.debounce = 15
    const wait = (ms: number) =>
        new Promise<void>(resolve => {
            setTimeout(resolve, ms)
        })

    test("api online when previously offline", async () => {
        statusState.isDestinyApiEnabled = false

        statusState.debounceOnlineEvent()
        expect(statusState.isDestinyApiEnabled).toBeFalse()
        expect(statusState.timer).not.toBeNull()

        await wait(10)
        statusState.debounceOnlineEvent()
        expect(statusState.isDestinyApiEnabled).toBeFalse()
        expect(statusState.timer).not.toBeNull()

        await wait(10)
        expect(statusState.isDestinyApiEnabled).toBeTrue()
        expect(statusState.timer).toBeNull()
    })

    test("api offline when previously online", async () => {
        statusState.isDestinyApiEnabled = true

        statusState.debounceOfflineEvent()
        expect(statusState.isDestinyApiEnabled).toBeTrue()
        expect(statusState.timer).not.toBeNull()

        await wait(10)
        statusState.debounceOfflineEvent()
        expect(statusState.isDestinyApiEnabled).toBeTrue()
        expect(statusState.timer).not.toBeNull()

        await wait(10)
        expect(statusState.isDestinyApiEnabled).toBeFalse()
        expect(statusState.timer).toBeNull()
    })

    test("api offline even then online event", async () => {
        statusState.isDestinyApiEnabled = true

        statusState.debounceOfflineEvent()
        expect(statusState.isDestinyApiEnabled).toBeTrue()
        expect(statusState.timer).not.toBeNull()

        await wait(10)
        statusState.debounceOnlineEvent()
        expect(statusState.isDestinyApiEnabled).toBeTrue()
        expect(statusState.timer).toBeNull()

        await wait(10)
        expect(statusState.isDestinyApiEnabled).toBeTrue()
        expect(statusState.timer).toBeNull()
    })

    test("api online even then offline event", async () => {
        statusState.isDestinyApiEnabled = false

        statusState.debounceOnlineEvent()
        expect(statusState.isDestinyApiEnabled).toBeFalse()
        expect(statusState.timer).not.toBeNull()

        await wait(10)
        statusState.debounceOfflineEvent()
        expect(statusState.isDestinyApiEnabled).toBeFalse()
        expect(statusState.timer).toBeNull()

        await wait(10)
        expect(statusState.isDestinyApiEnabled).toBeFalse()
        expect(statusState.timer).toBeNull()
    })
})
