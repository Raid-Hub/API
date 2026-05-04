import * as libsql from "@libsql/client"
import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test"
import { lookupBungieMembershipIdForDiscordUser } from "./lookup-discord-account"

describe("lookupBungieMembershipIdForDiscordUser", () => {
    let prevTursoUrl: string | undefined
    const execute = mock(() => Promise.resolve({ rows: [] as unknown[] }))
    let createSpy: { mockRestore: () => void } | undefined

    beforeEach(() => {
        prevTursoUrl = process.env.RAIDHUB_ACCOUNT_TURSO_URL
        execute.mockReset()
        createSpy = spyOn(libsql, "createClient").mockImplementation(
            () => ({ execute }) as unknown as libsql.Client
        ) as { mockRestore: () => void }
    })

    afterEach(() => {
        createSpy?.mockRestore()
        if (prevTursoUrl === undefined) {
            Reflect.deleteProperty(process.env, "RAIDHUB_ACCOUNT_TURSO_URL")
        } else {
            process.env.RAIDHUB_ACCOUNT_TURSO_URL = prevTursoUrl
        }
    })

    test("returns null for whitespace-only discord id", async () => {
        expect(await lookupBungieMembershipIdForDiscordUser("   ")).toBeNull()
    })

    test("returns null when Turso URL is not configured", async () => {
        Reflect.deleteProperty(process.env, "RAIDHUB_ACCOUNT_TURSO_URL")
        expect(await lookupBungieMembershipIdForDiscordUser("123")).toBeNull()
    })

    test("returns bungie id when account row exists", async () => {
        process.env.RAIDHUB_ACCOUNT_TURSO_URL = "libsql://test"
        execute.mockImplementation(() =>
            Promise.resolve({
                rows: [{ mid: "4611686018427387905" }]
            })
        )
        expect(await lookupBungieMembershipIdForDiscordUser("discord-snowflake")).toBe(
            "4611686018427387905"
        )
        expect(execute).toHaveBeenCalled()
    })

    test("coerces numeric mid to string", async () => {
        process.env.RAIDHUB_ACCOUNT_TURSO_URL = "libsql://test"
        execute.mockImplementation(() => Promise.resolve({ rows: [{ mid: 42 }] }))
        expect(await lookupBungieMembershipIdForDiscordUser("discord-snowflake")).toBe("42")
    })

    test("returns null when no row", async () => {
        process.env.RAIDHUB_ACCOUNT_TURSO_URL = "libsql://test"
        execute.mockImplementation(() => Promise.resolve({ rows: [] }))
        expect(await lookupBungieMembershipIdForDiscordUser("discord-snowflake")).toBeNull()
    })

    test("returns null when mid is null", async () => {
        process.env.RAIDHUB_ACCOUNT_TURSO_URL = "libsql://test"
        execute.mockImplementation(() => Promise.resolve({ rows: [{ mid: null }] }))
        expect(await lookupBungieMembershipIdForDiscordUser("discord-snowflake")).toBeNull()
    })

    test("returns null when trimmed mid is empty string", async () => {
        process.env.RAIDHUB_ACCOUNT_TURSO_URL = "libsql://test"
        execute.mockImplementation(() => Promise.resolve({ rows: [{ mid: "  " }] }))
        expect(await lookupBungieMembershipIdForDiscordUser("discord-snowflake")).toBeNull()
    })

    test("returns null when execute throws", async () => {
        process.env.RAIDHUB_ACCOUNT_TURSO_URL = "libsql://test"
        execute.mockImplementation(() => Promise.reject(new Error("turso down")))
        expect(await lookupBungieMembershipIdForDiscordUser("discord-snowflake")).toBeNull()
    })
})
