import { afterAll, beforeEach, describe, expect, spyOn, test } from "bun:test"
import { getAtlasStatus } from "./getAtlasStatus"

describe("getAtlasStatus with mock", () => {
    const spyFetch = spyOn(globalThis, "fetch")

    beforeEach(() => {
        spyFetch.mockReset()
    })

    afterAll(() => {
        spyFetch.mockRestore()
    })

    test("should return isCrawling: false and lag: null", async () => {
        spyFetch.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    status: "success",
                    data: {}
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
})

describe("getAtlasStatus no mock", () => {
    test("returns isCrawling: true and lag: 0", async () => {
        const result = await getAtlasStatus()

        expect(result.isCrawling).toBe(true)
        expect(result.lag).toBeWithin(25, 45)
    })
})
