import { afterAll, beforeEach, describe, expect, spyOn, test } from "bun:test"
import * as BungieCoreEndpoints from "bungie-net-core/endpoints/Core"
import { BungieNetResponse } from "bungie-net-core/interfaces"
import { CoreSettingsConfiguration } from "bungie-net-core/models"
import * as GetAtlasStatusModule from "../services/prometheus/atlas"
import * as GetFloodgatesRecentIdModule from "../services/prometheus/floodgates"
import * as GetFloodgatesStatusModule from "../services/rabbitmq/api"
import { expectOk } from "../util.test"
import { statusRoute, statusState } from "./status"

describe("status 200", async () => {
    const spyGetAtlasStatus = spyOn(GetAtlasStatusModule, "getAtlasStatus")
    const spyGetCommonSettings = spyOn(BungieCoreEndpoints, "getCommonSettings")
    const spyGetFloodgatesRecentId = spyOn(GetFloodgatesRecentIdModule, "getFloodgatesRecentId")
    const spyGetFloodgatesStatus = spyOn(GetFloodgatesStatusModule, "getFloodgatesStatus")

    beforeEach(() => {
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
    })

    afterAll(() => {
        spyGetAtlasStatus.mockRestore()
        spyGetCommonSettings.mockRestore()
        spyGetFloodgatesRecentId.mockRestore()
        spyGetFloodgatesStatus.mockRestore()
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

            spyGetFloodgatesRecentId.mockResolvedValueOnce("16142032033")

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
            spyGetFloodgatesRecentId.mockResolvedValueOnce("16142032033")

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
