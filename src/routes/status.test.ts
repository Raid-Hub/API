import { afterAll, beforeEach, describe, expect, spyOn, test } from "bun:test"
import * as BungieCoreEndpoints from "bungie-net-core/endpoints/Core"
import { BungieNetResponse } from "bungie-net-core/interfaces"
import { CoreSettingsConfiguration } from "bungie-net-core/models"
import * as GetAtlasStatusModule from "../services/prometheus/getAtlasStatus"
import { expectOk } from "../util.test"
import { statusRoute, statusState } from "./status"

describe("status 200", async () => {
    const spyGetAtlasStatus = spyOn(GetAtlasStatusModule, "getAtlasStatus")
    const spyGetCommonSettings = spyOn(BungieCoreEndpoints, "getCommonSettings")

    beforeEach(() => {
        spyGetAtlasStatus.mockReset()
        spyGetCommonSettings.mockReset()
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
    })

    const t = async () => {
        const result = await statusRoute.$mock()
        expectOk(result)

        if (result.type !== "ok") {
            throw new Error("Expected 200 response")
        }

        return result.parsed
    }

    test("crawling", async () => {
        statusState.isDestinyApiEnabled = true
        spyGetAtlasStatus.mockResolvedValueOnce({
            isCrawling: true,
            lag: 30
        })
        const data = await t()
        expect(data.AtlasPGCR.status).toBe("Crawling")
    })

    test("offline", async () => {
        statusState.isDestinyApiEnabled = true
        spyGetAtlasStatus.mockResolvedValueOnce({
            isCrawling: false,
            lag: null
        })
        const data = await t()
        expect(data.AtlasPGCR.status).toBe("Offline")
    })

    test("idle", async () => {
        statusState.isDestinyApiEnabled = false
        spyGetAtlasStatus.mockResolvedValueOnce({
            isCrawling: false,
            lag: null
        })
        const data = await t()
        expect(data.AtlasPGCR.status).toBe("Idle")
    })
})
