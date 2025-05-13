import { afterAll, beforeEach, describe, expect, it, spyOn } from "bun:test"
import { getFloodgatesStatus } from "./api"

describe("getFloodgatesStatus", () => {
    describe("with mock", () => {
        const spyFetch = spyOn(globalThis, "fetch")

        beforeEach(() => {
            spyFetch.mockReset()
        })

        afterAll(() => {
            spyFetch.mockRestore()
        })

        it("queries correctly", async () => {
            spyFetch.mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        messages: 10,
                        backing_queue_status: {
                            avg_ack_ingress_rate: 0.5,
                            avg_ingress_rate: 1.0
                        }
                    }),
                    {
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                )
            )

            const result = await getFloodgatesStatus()

            expect(spyFetch).toHaveBeenCalledTimes(1)
            expect(result).toEqual({
                waiting: 10,
                ackRateSeconds: 0.5,
                ingressRateSeconds: 1.0
            })
        })
    })

    it("it reads the data correctly", async () => {
        const result = await getFloodgatesStatus()

        expect(result).toEqual({
            waiting: expect.any(Number),
            ackRateSeconds: expect.any(Number),
            ingressRateSeconds: expect.any(Number)
        })
    })
})
