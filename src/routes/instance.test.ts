import { afterAll, beforeEach, describe, expect, spyOn, test } from "bun:test"

import { pgReader } from "@/integrations/postgres"
import { instanceCharacterQueue, playersQueue } from "@/integrations/rabbitmq/queues"
import { expectErr, expectOk } from "@/lib/test-utils"

import { instanceRoute } from "./instance"

describe("activity 200", () => {
    const spyCharQueueSend = spyOn(instanceCharacterQueue, "sendJson")
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
        const existing = await pgReader.queryRow<{ instanceId: bigint }>(
            `SELECT instance_id AS "instanceId"
            FROM instance
            ORDER BY instance_id DESC
            LIMIT 1`
        )

        if (!existing) {
            return
        }

        await t(existing.instanceId.toString())
        expect(spyPlayersQueueSend).toHaveBeenCalled()
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

    test("returns 404 for invalid instance id", () => t("1"))
})
