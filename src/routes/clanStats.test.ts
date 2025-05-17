import { ErrorCode } from "@/schema/errors/ErrorCode"
import { BungieApiError, bungiePlatformHttp } from "@/services/bungie"
import { clanQueue, playersQueue } from "@/services/rabbitmq/queues"
import { expectErr, expectOk } from "@/test"
import { afterAll, beforeEach, describe, expect, spyOn, test } from "bun:test"
import { PlatformErrorCodes } from "bungie-net-core/enums"
import { clanStatsRoute } from "./clanStats"

describe("clan 200", () => {
    const spyClanQueueSend = spyOn(clanQueue, "send")
    const spyPlayersQueueSend = spyOn(playersQueue, "send")

    beforeEach(() => {
        spyClanQueueSend.mockReset()
        spyClanQueueSend.mockResolvedValueOnce(true)
        spyPlayersQueueSend.mockReset()
        spyPlayersQueueSend.mockResolvedValue(true)
    })

    afterAll(() => {
        spyClanQueueSend.mockRestore()
        spyPlayersQueueSend.mockRestore()
    })

    const t = async (groupId: string) => {
        const result = await clanStatsRoute.$mock({ params: { groupId } })
        expectOk(result)
        expect(spyClanQueueSend).toHaveBeenCalledTimes(1)
        if (result.type === "ok") {
            expect(spyPlayersQueueSend).toHaveBeenCalledTimes(result.parsed.members.length)
        }
    }

    test("Elysium", () => t("3148408"))

    test("Passion", () => t("4999487"))
})

describe("clan 404", () => {
    test("not a clan", async () => {
        const result = await clanStatsRoute.$mock({ params: { groupId: "1" } })

        expectErr(result)
        if (result.type === "err") {
            expect(result.code).toBe(ErrorCode.ClanNotFound)
        }
    })

    test("not found", async () => {
        const result = await clanStatsRoute.$mock({ params: { groupId: "9999999999999" } })

        expectErr(result)
        if (result.type === "err") {
            expect(result.code).toBe(ErrorCode.ClanNotFound)
        }
    })
})

test("clan 503", async () => {
    const spyBungieFetch = spyOn(bungiePlatformHttp, "fetch")

    afterAll(() => {
        spyBungieFetch.mockRestore()
    })

    test("system disabled", async () => {
        spyBungieFetch.mockRejectedValueOnce(
            new BungieApiError({
                cause: {
                    ErrorCode: PlatformErrorCodes.SystemDisabled,
                    Message: "System Disabled",
                    ThrottleSeconds: 0,
                    Response: undefined,
                    ErrorStatus: "",
                    MessageData: {},
                    DetailedErrorTrace: ""
                },
                url: new URL("http://localhost/mocked")
            })
        )

        const result = await clanStatsRoute.$mock({
            params: {
                groupId: "3148408"
            }
        })

        expectErr(result)
        if (result.type === "err") {
            expect(result.code).toBe(ErrorCode.BungieServiceOffline)
        }
    })
})
