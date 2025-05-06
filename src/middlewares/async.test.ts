import { afterAll, beforeAll, beforeEach, describe, expect, spyOn, test } from "bun:test"
import express from "express"
import request from "supertest"
import { playersQueue } from "../services/rabbitmq/queues"
import { processPlayerAsync } from "./processPlayerAsync"

const app = express()

describe("player", () => {
    beforeAll(() => {
        app.use("/player/200/:membershipId", processPlayerAsync, (req, res) => {
            req.params.membershipId = BigInt(req.params.membershipId)
            res.sendStatus(200)
        })

        app.use("/player/404/:membershipId", processPlayerAsync, (req, res) => {
            req.params.membershipId = BigInt(req.params.membershipId)
            res.sendStatus(404)
        })
    })

    const spyPlayersQueueSend = spyOn(playersQueue, "send")

    beforeEach(() => {
        spyPlayersQueueSend.mockReset()
        spyPlayersQueueSend.mockResolvedValueOnce(true)
    })

    afterAll(() => {
        spyPlayersQueueSend.mockRestore()
    })

    test("sends on 200", async () => {
        const res = await request(app).get("/player/200/4611686018488107374")
        expect(res.status).toBe(200)

        expect(spyPlayersQueueSend).toHaveBeenCalledTimes(1)
        expect(spyPlayersQueueSend).toHaveBeenCalledWith({ membershipId: 4611686018488107374n })
    })

    test("sends on 404", async () => {
        const res = await request(app).get("/player/404/4611686018488107374")
        expect(res.status).toBe(404)

        expect(spyPlayersQueueSend).toHaveBeenCalledTimes(1)
        expect(spyPlayersQueueSend).toHaveBeenCalledWith({ membershipId: 4611686018488107374n })
    })
})
