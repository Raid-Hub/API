import * as contextJwt from "@/integrations/discord/context-jwt"
import * as lookupDiscord from "@/integrations/discord/lookup-discord-account"
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { attachDiscordContext } from "./discord-context"

type Req = Parameters<typeof attachDiscordContext>[0]
type Res = Parameters<typeof attachDiscordContext>[1]
type Next = Parameters<typeof attachDiscordContext>[2]

const validDiscordContext = {
    interactionId: "i",
    commandName: "c",
    userId: "u1",
    routeId: "r"
}

describe("attachDiscordContext", () => {
    afterEach(() => {
        mock.restore()
    })

    test("continues with no authorization header", async () => {
        let nextCalled = false
        const req = { headers: {} } as Req
        const res = {} as Res
        await Promise.resolve(
            attachDiscordContext(req, res, () => {
                nextCalled = true
            })
        )
        expect(nextCalled).toBe(true)
        expect(req.discord).toBeUndefined()
        expect(req.discordRaidHubUser).toBeUndefined()
    })

    test("continues when scheme is not Discord (string header)", async () => {
        let nextCalled = false
        const req = { headers: { authorization: "Bearer token" } } as Req
        const res = {} as Res
        await Promise.resolve(
            attachDiscordContext(req, res, () => {
                nextCalled = true
            })
        )
        expect(nextCalled).toBe(true)
        expect(req.discord).toBeUndefined()
    })

    test("ignores non-Discord authorization headers provided as arrays", async () => {
        let nextCalled = false
        const req = {
            headers: {
                authorization: ["Bearer token"]
            }
        } as unknown as Req
        const res = {} as Res

        await Promise.resolve(
            attachDiscordContext(req, res, () => {
                nextCalled = true
            })
        )

        expect(nextCalled).toBe(true)
        expect(req.discord).toBeUndefined()
    })

    test("attaches discord and bungie user when token and lookup succeed", async () => {
        spyOn(contextJwt, "verifyDiscordInvocationContext").mockReturnValue(validDiscordContext)
        spyOn(lookupDiscord, "lookupBungieMembershipIdForDiscordUser").mockResolvedValue(
            "4611686018427387905"
        )

        let nextCalled = false
        const req = {
            headers: { authorization: "Discord signed-jwt" }
        } as Req
        const res = {} as Res

        await Promise.resolve(
            attachDiscordContext(req, res, () => {
                nextCalled = true
            })
        )

        expect(nextCalled).toBe(true)
        expect(req.discord).toEqual(validDiscordContext)
        expect(req.discordRaidHubUser).toEqual({ bungieMembershipId: "4611686018427387905" })
    })

    test("attaches discord but not bungie user when lookup returns null", async () => {
        spyOn(contextJwt, "verifyDiscordInvocationContext").mockReturnValue(validDiscordContext)
        spyOn(lookupDiscord, "lookupBungieMembershipIdForDiscordUser").mockResolvedValue(null)

        let nextCalled = false
        const req = {
            headers: { authorization: "Discord signed-jwt" }
        } as Req
        const res = {} as Res

        await Promise.resolve(
            attachDiscordContext(req, res, () => {
                nextCalled = true
            })
        )

        expect(nextCalled).toBe(true)
        expect(req.discord).toEqual(validDiscordContext)
        expect(req.discordRaidHubUser).toBeUndefined()
    })

    test("attaches discord but not bungie user when lookup throws", async () => {
        spyOn(contextJwt, "verifyDiscordInvocationContext").mockReturnValue(validDiscordContext)
        spyOn(lookupDiscord, "lookupBungieMembershipIdForDiscordUser").mockRejectedValue(
            new Error("db")
        )

        let nextCalled = false
        const req = {
            headers: { authorization: "Discord signed-jwt" }
        } as Req
        const res = {} as Res

        await Promise.resolve(
            attachDiscordContext(req, res, () => {
                nextCalled = true
            })
        )

        expect(nextCalled).toBe(true)
        expect(req.discord).toEqual(validDiscordContext)
        expect(req.discordRaidHubUser).toBeUndefined()
    })

    test("returns InvalidDiscordAuthError for invalid Discord token in header array", async () => {
        let statusCode: number | undefined
        let payload: unknown
        const req = {
            headers: {
                authorization: ["Discord invalid-token"]
            }
        } as unknown as Req
        const res = {
            status: (code: number) => {
                statusCode = code
                return {
                    json: (body: unknown) => {
                        payload = body
                    }
                }
            }
        } as Res

        await Promise.resolve(attachDiscordContext(req, res, (() => {}) as Next))

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
