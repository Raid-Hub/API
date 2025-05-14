import { afterAll, beforeEach, describe, expect, it, spyOn, test } from "bun:test"
import { getFloodgatesRecentId } from "./floodgates"

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
