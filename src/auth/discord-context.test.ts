import { describe, expect, test } from "bun:test"
import { attachDiscordContext } from "./discord-context"

describe("attachDiscordContext", () => {
    test("ignores non-Discord authorization headers provided as arrays", () => {
        let nextCalled = false
        const req = {
            headers: {
                authorization: ["Bearer token"]
            }
        } as never
        const res = {} as never

        attachDiscordContext(req, res, () => {
            nextCalled = true
        })

        expect(nextCalled).toBe(true)
        expect(req.discord).toBeUndefined()
    })

    test("returns InvalidDiscordAuthError for invalid Discord token in header array", () => {
        let statusCode: number | undefined
        let payload: unknown
        const req = {
            headers: {
                authorization: ["Discord invalid-token"]
            }
        } as never
        const res = {
            status: (code: number) => {
                statusCode = code
                return {
                    json: (body: unknown) => {
                        payload = body
                    }
                }
            }
        } as never

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
