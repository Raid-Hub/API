import { describe, expect, test } from "bun:test"
import { attachDiscordContext } from "./discord-context"

describe("attachDiscordContext", () => {
    test("ignores non-Discord authorization headers provided as arrays", () => {
        let nextCalled = false
        const req = {
            headers: {
                authorization: ["Bearer token"]
            }
        } as unknown as Parameters<typeof attachDiscordContext>[0]
        const res = {} as Parameters<typeof attachDiscordContext>[1]

        attachDiscordContext(req, res, () => {
            nextCalled = true
        })

        expect(nextCalled).toBe(true)
        expect((req as { discord?: unknown }).discord).toBeUndefined()
    })

    test("returns InvalidDiscordAuthError for invalid Discord token in header array", () => {
        let statusCode: number | undefined
        let payload: unknown
        const req = {
            headers: {
                authorization: ["Discord invalid-token"]
            }
        } as unknown as Parameters<typeof attachDiscordContext>[0]
        const res = {
            status: (code: number) => {
                statusCode = code
                return {
                    json: (body: unknown) => {
                        payload = body
                    }
                }
            }
        } as Parameters<typeof attachDiscordContext>[1]

        attachDiscordContext(req, res, () => {})

        expect(statusCode).toBe(401)
        expect(payload).toMatchObject({
            success: false,
            code: "InvalidDiscordAuthError",
            error: {
                message: "Invalid Discord context token"
            }
        })
    })
})
