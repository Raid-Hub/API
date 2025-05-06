import { afterAll, beforeEach, describe, expect, spyOn, test } from "bun:test"
import { instanceCharacterQueue, playersQueue } from "../services/rabbitmq/queues"
import { expectErr, expectOk } from "../util.test"
import { activityRoute } from "./activity"

describe("activity 200", () => {
    const spyCharQueue = spyOn(instanceCharacterQueue, "send")
    const spyPlayersQueue = spyOn(playersQueue, "send")

    beforeEach(() => {
        spyCharQueue.mockReset()
        spyCharQueue.mockResolvedValueOnce(true)
        spyPlayersQueue.mockReset()
        spyPlayersQueue.mockResolvedValue(true)
    })

    afterAll(() => {
        spyCharQueue.mockRestore()
        spyPlayersQueue.mockRestore()
    })

    const t = async (instanceId: string) => {
        const result = await activityRoute.$mock({ params: { instanceId } })

        expectOk(result)
    }

    test("normal", async () => {
        await t("6318497407")
        expect(instanceCharacterQueue).toHaveBeenCalledTimes(0)
        expect(spyPlayersQueue).toHaveBeenCalledTimes(6)
    })

    test("missing character", async () => {
        await t("258758374")
        expect(instanceCharacterQueue).toHaveBeenCalledTimes(1)
        expect(spyPlayersQueue).toHaveBeenCalledTimes(6)
        expect(instanceCharacterQueue).toHaveBeenCalledWith({
            instanceId: 258758374n,
            membershipId: "4611686018465791772",
            characterId: "2305843009271027922"
        })
    })
})

describe("activity 404", () => {
    const t = async (instanceId: string) => {
        const result = await activityRoute.$mock({
            params: {
                instanceId
            }
        })

        expectErr(result)
    }

    test("1", () => t("1"))
})
