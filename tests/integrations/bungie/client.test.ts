import { afterAll, beforeEach, describe, expect, spyOn, test } from "bun:test"
import { getDestinyManifest, transferItem } from "bungie-net-core/endpoints/Destiny2"
import { bungiePlatformHttp } from "@/integrations/bungie/client"
import { BungieApiError } from "@/integrations/bungie/error"

describe("bungie http client", () => {
    const bungieHttp = bungiePlatformHttp({
        ttl: 1000
    })

    test("ok", async () => {
        const res = await getDestinyManifest(bungieHttp)

        expect(res.ErrorCode).toBe(1)
    })

    test("error", async () => {
        try {
            const res = await transferItem(bungieHttp, {
                itemReferenceHash: 691752909,
                stackSize: 1,
                transferToVault: true,
                itemId: "691752909",
                characterId: "2305843009265044317",
                membershipType: 3
            })
            expect(res.ErrorCode).toBe(99)
        } catch (err: any) {
            expect(err).toBeInstanceOf(BungieApiError)
            expect(err.cause.ErrorCode).toBe(99)
        }
    })

    test("html error", async () => {
        const url = new URL("https://www.bungie.net/Platform/Destiny2")
        try {
            const res = await bungieHttp.fetch({
                url: url,
                method: "POST"
            })
            expect(res).toBe(null)
        } catch (err: any) {
            expect(err).toBeInstanceOf(Error)
            expect(err.cause).toContain("html")
        }
    })
})

describe("bungie http client with mocks", () => {
    const bungieHttp = bungiePlatformHttp({
        ttl: 1000
    })
    const spyFetch = spyOn(globalThis, "fetch")

    beforeEach(() => {
        spyFetch.mockReset()
    })

    afterAll(() => {
        spyFetch.mockRestore()
    })

    test("json error", async () => {
        const mockResponse = new Response(JSON.stringify({ ok: true }), {
            headers: {
                "Content-Type": "application/json"
            }
        })
        spyFetch.mockResolvedValueOnce(mockResponse)

        try {
            const res = await bungieHttp.fetch({
                url: new URL("http://localhost/mocked"),
                method: "GET"
            })

            expect(res).toBeNull()
        } catch (err: any) {
            expect(spyFetch).toHaveBeenCalledTimes(1)
            expect(err).toBeInstanceOf(Error)
            expect(err.message).toBe("Invalid JSON response")
        }
    })

    test("http error", async () => {
        const mockResponse = new Response(null, {
            status: 504,
            statusText: "Gateway Timeout"
        })
        spyFetch.mockResolvedValueOnce(mockResponse)

        try {
            const res = await bungieHttp.fetch({
                url: new URL("http://localhost/mocked"),
                method: "GET"
            })

            expect(res).toBeNull()
        } catch (err: any) {
            expect(spyFetch).toHaveBeenCalledTimes(1)
            expect(err).toBeInstanceOf(Error)
            expect(err.message).toBe("Invalid response (504): Gateway Timeout")
        }
    })
})
