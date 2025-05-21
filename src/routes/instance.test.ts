import { instanceCharacterQueue, playersQueue } from "@/integrations/rabbitmq/queues"
import { expectErr, expectOk } from "@/lib/test-utils"
import { afterAll, beforeEach, describe, expect, spyOn, test } from "bun:test"
import { instanceRoute } from "./instance"

describe("activity 200", () => {
    const spyCharQueueSend = spyOn(instanceCharacterQueue, "send")
    const spyPlayersQueueSend = spyOn(playersQueue, "send")

    beforeEach(() => {
        spyCharQueueSend.mockReset()
        spyCharQueueSend.mockResolvedValueOnce(true)
        spyPlayersQueueSend.mockReset()
        spyPlayersQueueSend.mockResolvedValue(true)
    })

    afterAll(() => {
        spyCharQueueSend.mockRestore()
        spyPlayersQueueSend.mockRestore()
    })

    const t = async (instanceId: string) => {
        const result = await instanceRoute.$mock({ params: { instanceId } })

        expectOk(result)
    }

    test("normal", async () => {
        await t("6318497407")
        expect(spyCharQueueSend).toHaveBeenCalledTimes(0)
        expect(spyPlayersQueueSend).toHaveBeenCalledTimes(6)
    })

    test("missing character", async () => {
        await t("258758374")
        expect(spyCharQueueSend).toHaveBeenCalledTimes(1)
        expect(spyPlayersQueueSend).toHaveBeenCalledTimes(6)
        expect(spyCharQueueSend).toHaveBeenCalledWith({
            instanceId: 258758374n,
            membershipId: "4611686018465791772",
            characterId: "2305843009271027922"
        })
    })
})

describe("activity 404", () => {
    const t = async (instanceId: string) => {
        const result = await instanceRoute.$mock({
            params: {
                instanceId
            }
        })

        expectErr(result)
    }

    test("1", () => t("1"))
})
