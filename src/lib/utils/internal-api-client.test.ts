import { afterAll, beforeEach, describe, expect, spyOn, test } from "bun:test"
import { InternalApiError, internalApiFetch } from "./internal-api-client"

describe("internalApiFetch", () => {
    const spyFetch = spyOn(globalThis, "fetch")
    const serviceName = "TestService"

    beforeEach(() => {
        spyFetch.mockReset()
    })

    afterAll(() => {
        spyFetch.mockRestore()
    })

    test("successful JSON response", async () => {
        const mockData = { success: true, data: { id: 123 } }
        const mockResponse = new Response(JSON.stringify(mockData), {
            status: 200,
            statusText: "OK",
            headers: {
                "Content-Type": "application/json"
            }
        })
        spyFetch.mockResolvedValueOnce(mockResponse)

        const result = await internalApiFetch<typeof mockData>(
            serviceName,
            "http://localhost/api/test"
        )

        expect(spyFetch).toHaveBeenCalledTimes(1)
        expect(result).toEqual(mockData)
    })

    test("non-OK status code throws InternalApiError", async () => {
        const mockResponse = new Response(JSON.stringify({ error: "Not Found" }), {
            status: 404,
            statusText: "Not Found",
            headers: {
                "Content-Type": "application/json"
            }
        })
        spyFetch.mockResolvedValueOnce(mockResponse)

        try {
            await internalApiFetch(serviceName, "http://localhost/api/test")
            expect(true).toBe(false) // Should not reach here
        } catch (err) {
            expect(err).toBeInstanceOf(InternalApiError)
            const error = err as InternalApiError
            expect(error.serviceName).toBe(serviceName)
            expect(error.status).toBe(404)
            expect(error.statusText).toBe("Not Found")
            expect(error.url.toString()).toBe("http://localhost/api/test")
            expect(error.cause).toBe(mockResponse)
            expect(error.message).toContain("404")
            expect(error.message).toContain("Not Found")
        }
    })

    test("non-JSON content-type throws InternalApiError", async () => {
        const mockResponse = new Response("text content", {
            status: 200,
            statusText: "OK",
            headers: {
                "Content-Type": "text/plain"
            }
        })
        spyFetch.mockResolvedValueOnce(mockResponse)

        try {
            await internalApiFetch(serviceName, "http://localhost/api/test")
            expect(true).toBe(false) // Should not reach here
        } catch (err) {
            expect(err).toBeInstanceOf(InternalApiError)
            const error = err as InternalApiError
            expect(error.serviceName).toBe(serviceName)
            expect(error.status).toBe(200)
            expect(error.statusText).toBe("OK")
            expect(error.url.toString()).toBe("http://localhost/api/test")
            expect(error.message).toContain("Failed to parse JSON")
        }
    })

    test("invalid JSON throws SyntaxError (propagates naturally)", async () => {
        const mockResponse = new Response("invalid json {", {
            status: 200,
            statusText: "OK",
            headers: {
                "Content-Type": "application/json"
            }
        })
        spyFetch.mockResolvedValueOnce(mockResponse)

        try {
            await internalApiFetch(serviceName, "http://localhost/api/test")
            expect(true).toBe(false) // Should not reach here
        } catch (err) {
            expect(err).toBeInstanceOf(SyntaxError)
            expect(err).not.toBeInstanceOf(InternalApiError)
        }
    })
})
