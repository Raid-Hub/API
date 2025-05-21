import { afterAll, beforeEach, describe, expect, it, spyOn, test } from "bun:test"
import { getFloodgatesRecentId, getFloodgatesStatus } from "."

describe("getFloodgatesRecentId with mock", () => {
    const spyFetch = spyOn(globalThis, "fetch")

    beforeEach(() => {
        spyFetch.mockReset()
    })

    afterAll(() => {
        spyFetch.mockRestore()
    })

    test("no data", async () => {
        spyFetch.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    status: "success",
                    data: { result: [] }
                }),
                {
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            )
        )

        const result = await getFloodgatesRecentId()

        expect(spyFetch).toHaveBeenCalledTimes(1)
        expect(result).toBeNull()
    })

    test("id 0 in data", async () => {
        spyFetch.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    status: "success",
                    data: {
                        result: [
                            {
                                value: [Date.now() / 1000, "0"]
                            }
                        ]
                    }
                }),
                {
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            )
        )

        const result = await getFloodgatesRecentId()

        expect(spyFetch).toHaveBeenCalledTimes(1)
        expect(result).toBeNull()
    })

    test("id returned in data", async () => {
        spyFetch.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    status: "success",
                    data: {
                        result: [
                            {
                                value: [Date.now() / 1000, "16133231214"]
                            }
                        ]
                    }
                }),
                {
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            )
        )

        const result = await getFloodgatesRecentId()

        expect(spyFetch).toHaveBeenCalledTimes(1)
        expect(result).toBe("16133231214")
    })
})

describe("getFloodgatesRecentId no mock", () => {
    it("is normally null", async () => {
        const result = await getFloodgatesRecentId()

        expect(result).toBeNull()
    })
})

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
