import { afterAll, beforeEach, describe, expect, spyOn, test } from "bun:test"
import { getAtlasStatus } from "@/services/atlas"

describe("getAtlasStatus with mock", () => {
    const spyFetch = spyOn(globalThis, "fetch")

    beforeEach(() => {
        spyFetch.mockReset()
    })

    afterAll(() => {
        spyFetch.mockRestore()
    })

    test("not crawling", async () => {
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

        const result = await getAtlasStatus()

        expect(spyFetch).toHaveBeenCalledTimes(1)
        expect(result.isCrawling).toEqual(false)
        expect(result.lag).toBeNull()
    })

    test("crawling with catchup needed", async () => {
        const nowS = Date.now() / 1000
        const countValues = 10
        spyFetch.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    status: "success",
                    data: {
                        result: [
                            {
                                values: Array.from({ length: countValues }, (_, idx) => [
                                    nowS - 15 * (countValues - (idx + 1)),
                                    String(1200 - 5 * idx ** 1.85)
                                ])
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

        const result = await getAtlasStatus()

        expect(spyFetch).toHaveBeenCalledTimes(1)
        expect(result.isCrawling).toBeTrue()
        if (result.isCrawling) {
            expect(result.lag).toBeCloseTo(994.048, 3)
            expect(result.estimatedCatchUpTime).toBeCloseTo(329.144, 3)
        }
    })

    test("crawling but regressing", async () => {
        const nowS = Date.now() / 1000
        const countValues = 10
        spyFetch.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    status: "success",
                    data: {
                        result: [
                            {
                                values: Array.from({ length: countValues }, (_, idx) => [
                                    nowS - 15 * (countValues - (idx + 1)),
                                    String(1200 + 20 * idx ** 1.2)
                                ])
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

        const result = await getAtlasStatus()

        expect(spyFetch).toHaveBeenCalledTimes(1)
        expect(result.isCrawling).toBeTrue()
        if (result.isCrawling) {
            expect(result.lag).toBeCloseTo(1419.603, 3)
            expect(result.estimatedCatchUpTime).toBe(-1)
        }
    })
})

describe("getAtlasStatus no mock", () => {
    test("is crawling normally", async () => {
        const result = await getAtlasStatus()

        expect(result.isCrawling).toBeTrue()
        expect(result.lag).toBeWithin(10, 120)
    })
})
