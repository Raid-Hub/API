import { afterAll, beforeEach, describe, expect, test } from "bun:test"

import { pgAdmin } from "@/integrations/postgres"
import {
    deleteDiscordWebhook,
    getDiscordWebhookStatus,
    registerDiscordWebhook,
    updateDiscordWebhook,
    upsertDiscordWebhook
} from "./discord-webhooks"

describe("discord webhook subscriptions service", () => {
    const originalQueryRow = pgAdmin.queryRow.bind(pgAdmin)
    const originalQueryRows = pgAdmin.queryRows.bind(pgAdmin)
    const originalTransaction = pgAdmin.transaction.bind(pgAdmin)
    const originalFetch = globalThis.fetch
    const originalBotToken = process.env.DISCORD_BOT_TOKEN

    const queueQueryRow = (values: unknown[]) => {
        const queue = [...values]
        pgAdmin.queryRow = (async () => {
            await Promise.resolve()
            if (queue.length === 0) throw new Error("Unexpected queryRow call")
            return queue.shift() as never
        }) as typeof pgAdmin.queryRow
    }

    const queueQueryRows = (values: unknown[]) => {
        const queue = [...values]
        pgAdmin.queryRows = (async () => {
            await Promise.resolve()
            if (queue.length === 0) throw new Error("Unexpected queryRows call")
            return queue.shift() as never
        }) as typeof pgAdmin.queryRows
    }

    const queueTransaction = (rows: unknown[], rowsMany: unknown[]) => {
        const rowQueue = [...rows]
        const rowsQueue = [...rowsMany]
        pgAdmin.transaction = (async callback => {
            await Promise.resolve()
            const tx = {
                queryRow: async () => {
                    await Promise.resolve()
                    if (rowQueue.length === 0) throw new Error("Unexpected tx.queryRow call")
                    return rowQueue.shift() as never
                },
                queryRows: async () => {
                    await Promise.resolve()
                    if (rowsQueue.length === 0) throw new Error("Unexpected tx.queryRows call")
                    return rowsQueue.shift() as never
                }
            }
            return callback(tx as never)
        }) as typeof pgAdmin.transaction
    }

    beforeEach(() => {
        pgAdmin.queryRow = originalQueryRow
        pgAdmin.queryRows = originalQueryRows
        pgAdmin.transaction = originalTransaction
        globalThis.fetch = originalFetch
        process.env.DISCORD_BOT_TOKEN = originalBotToken
    })

    afterAll(() => {
        pgAdmin.queryRow = originalQueryRow
        pgAdmin.queryRows = originalQueryRows
        pgAdmin.transaction = originalTransaction
        globalThis.fetch = originalFetch
        process.env.DISCORD_BOT_TOKEN = originalBotToken
    })

    test("updateDiscordWebhook updates guild and rules in one transaction", async () => {
        queueTransaction([{ destinationId: "42" }, { id: "42" }], [[]])

        const result = await updateDiscordWebhook("channel_x", {
            guildId: "guild_x",
            filters: { requireFresh: true, requireCompleted: false },
            targets: {}
        })

        expect(result).toEqual({
            guildId: "guild_x",
            channelId: "channel_x",
            updated: true,
            rules: {
                players: { inserted: 0, updated: 0 },
                clans: { inserted: 0, updated: 0 }
            }
        })
    })

    test("upsertDiscordWebhook updates existing active destination", async () => {
        queueQueryRow([
            {
                destinationId: "99",
                webhookId: "webhook_abc",
                isActive: true
            }
        ])
        queueTransaction([{ destinationId: "99" }, { id: "99" }], [[]])

        const result = await upsertDiscordWebhook({
            guildId: "guild_1",
            channelId: "123456789",
            filters: {},
            targets: {}
        })

        expect(result).toEqual({
            guildId: "guild_1",
            channelId: "123456789",
            webhookId: "webhook_abc",
            created: false,
            activated: false,
            updated: true,
            rules: {
                players: { inserted: 0, updated: 0 },
                clans: { inserted: 0, updated: 0 }
            }
        })
    })

    test("upsertDiscordWebhook reactivates existing inactive destination", async () => {
        queueQueryRow([
            {
                destinationId: "77",
                webhookId: "webhook_xyz",
                isActive: false
            }
        ])
        queueTransaction([{ destinationId: "77" }, { id: "77" }], [[], []])

        const result = await upsertDiscordWebhook({
            guildId: "guild_2",
            channelId: "channel_2",
            filters: {},
            targets: {}
        })

        expect(result.activated).toBe(true)
        expect(result.updated).toBe(true)
        expect(result.created).toBe(false)
        expect(result.webhookId).toBe("webhook_xyz")
    })

    test("upsertDiscordWebhook reconciles rules when explicit empty targets are provided", async () => {
        queueQueryRow([
            {
                destinationId: "99",
                webhookId: "webhook_abc",
                isActive: true
            }
        ])
        queueTransaction([{ destinationId: "99" }, { id: "99" }], [[], [], []])

        const result = await upsertDiscordWebhook({
            guildId: "guild_1",
            channelId: "123456789",
            filters: {},
            targets: {
                playerMembershipIds: [],
                clanGroupIds: []
            }
        })

        expect(result.rules).toEqual({
            players: { inserted: 0, updated: 0 },
            clans: { inserted: 0, updated: 0 }
        })
    })

    test("getDiscordWebhookStatus returns full player/clan rule DTOs", async () => {
        queueQueryRow([
            {
                destinationId: "42",
                destinationActive: true,
                consecutiveDeliveryFailures: 3,
                lastDeliverySuccessAt: new Date("2026-04-22T00:00:00.000Z"),
                lastDeliveryFailureAt: null,
                lastDeliveryError: "timeout",
                guildId: "guild_9",
                channelId: "channel_9",
                webhookId: "webhook_9"
            }
        ])
        queueQueryRows([
            [
                {
                    membershipId: "4611686018467831285",
                    requireFresh: true,
                    requireCompleted: false,
                    activityRaidBitmap: 0
                }
            ],
            [
                {
                    groupId: "123456",
                    requireFresh: false,
                    requireCompleted: true,
                    activityRaidBitmap: 0
                }
            ]
        ])

        const result = await getDiscordWebhookStatus("channel_9")

        expect(result).toEqual({
            registered: true,
            guildId: "guild_9",
            channelId: "channel_9",
            webhookId: "webhook_9",
            destinationActive: true,
            consecutiveDeliveryFailures: 3,
            lastDeliverySuccessAt: "2026-04-22T00:00:00.000Z",
            lastDeliveryFailureAt: null,
            lastDeliveryError: "timeout",
            players: [
                {
                    membershipId: "4611686018467831285",
                    requireFresh: true,
                    requireCompleted: false,
                    raidIds: []
                }
            ],
            clans: [
                {
                    groupId: "123456",
                    requireFresh: false,
                    requireCompleted: true,
                    raidIds: []
                }
            ]
        })
    })

    test("getDiscordWebhookStatus resolves raidIds from activityRaidBitmap", async () => {
        queueQueryRow([
            {
                destinationId: "42",
                destinationActive: true,
                consecutiveDeliveryFailures: 0,
                lastDeliverySuccessAt: null,
                lastDeliveryFailureAt: null,
                lastDeliveryError: null,
                guildId: "guild_9",
                channelId: "channel_9",
                webhookId: "webhook_9"
            }
        ])
        queueQueryRows([
            [
                {
                    membershipId: "4611686018467831285",
                    requireFresh: true,
                    requireCompleted: false,
                    activityRaidBitmap: 512
                }
            ],
            []
        ])

        const result = await getDiscordWebhookStatus("channel_9")
        if (!result.registered) expect.unreachable("Expected registered status")

        expect(result.players[0].raidIds).toEqual([9])
    })

    test("getDiscordWebhookStatus decodes combined bitmap for raids 9 and 101", async () => {
        const bitmapRaid9And101 = 2 ** 9 + 2 ** 33
        queueQueryRow([
            {
                destinationId: "42",
                destinationActive: true,
                consecutiveDeliveryFailures: 0,
                lastDeliverySuccessAt: null,
                lastDeliveryFailureAt: null,
                lastDeliveryError: null,
                guildId: "guild_9",
                channelId: "channel_9",
                webhookId: "webhook_9"
            }
        ])
        queueQueryRows([
            [
                {
                    membershipId: "4611686018467831285",
                    requireFresh: true,
                    requireCompleted: false,
                    activityRaidBitmap: bitmapRaid9And101
                }
            ],
            []
        ])

        const result = await getDiscordWebhookStatus("channel_9")
        if (!result.registered) expect.unreachable("Expected registered status")

        expect(result.players[0].raidIds).toEqual([9, 101])
    })

    test("raid bitmap combine must not use JS bitwise OR (int32 truncates raid 101)", () => {
        const bit9 = 2 ** 9
        const bit101 = 2 ** 33
        expect(bit9 | bit101).not.toBe(bit9 + bit101)
        expect(bit9 + bit101).toBe(8589935104)
    })

    test("getDiscordWebhookStatus returns registered false when channel is unknown", async () => {
        queueQueryRow([null])

        const result = await getDiscordWebhookStatus("no_such_channel")

        expect(result).toEqual({ registered: false })
    })

    test("deleteDiscordWebhook deactivates destination", async () => {
        pgAdmin.transaction = (async callback => {
            const tx = {
                queryRow: async () => ({ destinationId: "55" }),
                queryRows: async () => []
            }
            return callback(tx as never)
        }) as typeof pgAdmin.transaction

        await deleteDiscordWebhook("channel_to_delete")
    })

    test("registerDiscordWebhook throws when DISCORD_BOT_TOKEN is unset", () => {
        delete process.env.DISCORD_BOT_TOKEN
        queueQueryRow([null])

        return expect(
            registerDiscordWebhook({
                guildId: "g",
                channelId: "c",
                name: "Test",
                filters: {},
                targets: {}
            })
        ).rejects.toThrow("DISCORD_BOT_TOKEN")
    })

    test("registerDiscordWebhook throws when Discord returns error", () => {
        process.env.DISCORD_BOT_TOKEN = "fake-token"
        queueQueryRow([null])
        globalThis.fetch = async () =>
            new Response("rate limited", {
                status: 429,
                statusText: "Too Many Requests"
            })

        return expect(
            registerDiscordWebhook({
                guildId: "g",
                channelId: "c",
                filters: {},
                targets: {}
            })
        ).rejects.toThrow("Discord webhook create failed with status 429")
    })

    test("registerDiscordWebhook deletes Discord webhook when DB transaction fails", async () => {
        process.env.DISCORD_BOT_TOKEN = "fake-token"
        queueQueryRow([null])
        const requests: { method: string; url: string }[] = []
        globalThis.fetch = async (input, init) => {
            const url =
                typeof input === "string"
                    ? input
                    : input instanceof Request
                      ? input.url
                      : input.href
            requests.push({ method: init?.method ?? "GET", url })
            if (init?.method === "DELETE") {
                return new Response(null, { status: 204 })
            }
            return new Response(JSON.stringify({ id: "wh_orphan", token: "tok_o" }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            })
        }

        queueTransaction([], [])

        try {
            await registerDiscordWebhook({
                guildId: "g",
                channelId: "c",
                filters: {},
                targets: {}
            })
            expect.unreachable("registerDiscordWebhook should have thrown")
        } catch (error: unknown) {
            expect(error).toBeInstanceOf(Error)
            expect((error as Error).message).toContain("Unexpected tx.queryRow call")
        }

        expect(requests.map(r => r.method)).toEqual(["POST", "DELETE"])
        expect(requests[1].url).toBe("https://discord.com/api/v10/webhooks/wh_orphan")
    })

    test("registerDiscordWebhook logs when orphan DELETE returns error", async () => {
        process.env.DISCORD_BOT_TOKEN = "fake-token"
        queueQueryRow([null])
        globalThis.fetch = async (input, init) => {
            if (init?.method === "DELETE") {
                return new Response("discord says no", { status: 500 })
            }
            return new Response(JSON.stringify({ id: "wh_bad_del", token: "tok_bd" }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            })
        }

        queueTransaction([], [])

        try {
            await registerDiscordWebhook({
                guildId: "g",
                channelId: "c",
                filters: {},
                targets: {}
            })
            expect.unreachable("registerDiscordWebhook should have thrown")
        } catch (error: unknown) {
            expect(error).toBeInstanceOf(Error)
            expect((error as Error).message).toContain("Unexpected tx.queryRow call")
        }
    })

    test("upsertDiscordWebhook registers when channel has no destination yet", async () => {
        process.env.DISCORD_BOT_TOKEN = "fake-token"
        globalThis.fetch = async () =>
            new Response(JSON.stringify({ id: "wh_ups", token: "tok_ups" }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            })

        queueQueryRow([null, null])
        queueTransaction([null, { id: "200" }], [[]])

        const result = await upsertDiscordWebhook({
            guildId: "guild_u",
            channelId: "chan_u",
            filters: {},
            targets: {}
        })

        expect(result.created).toBe(true)
        expect(result.updated).toBe(false)
        expect(result.activated).toBe(false)
        expect(result.webhookId).toBe("wh_ups")
        expect(result.webhookUrl).toBe("https://discord.com/api/webhooks/wh_ups/tok_ups")
        expect(result.rules.players.inserted).toBe(0)
    })

    test("registerDiscordWebhook deletes prior Discord webhook before replacing stored credentials", async () => {
        process.env.DISCORD_BOT_TOKEN = "fake-token"
        queueQueryRow([{ webhookId: "wh_prior" }])
        const requests: { method: string; url: string }[] = []
        globalThis.fetch = async (input, init) => {
            const url =
                typeof input === "string"
                    ? input
                    : input instanceof Request
                      ? input.url
                      : input.href
            requests.push({ method: init?.method ?? "GET", url })
            if (init?.method === "DELETE") {
                return new Response(null, { status: 204 })
            }
            return new Response(JSON.stringify({ id: "wh_next", token: "tok_next" }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            })
        }

        queueTransaction([{ id: "5", isActive: true }], [[]])

        const result = await registerDiscordWebhook({
            guildId: "guild_r",
            channelId: "chan_r",
            filters: {},
            targets: {}
        })

        expect(requests.map(r => r.method)).toEqual(["DELETE", "POST"])
        expect(requests[0].url).toBe("https://discord.com/api/v10/webhooks/wh_prior")
        expect(result.webhookId).toBe("wh_next")
        expect(result.created).toBe(false)
        expect(result.activated).toBe(false)
    })

    test("registerDiscordWebhook creates new destination when channel is new", async () => {
        process.env.DISCORD_BOT_TOKEN = "fake-token"
        globalThis.fetch = async () =>
            new Response(JSON.stringify({ id: "wh_new", token: "tok_new" }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            })

        queueQueryRow([null])
        queueTransaction([null, { id: "100" }], [[]])

        const result = await registerDiscordWebhook({
            guildId: "guild_reg",
            channelId: "chan_reg",
            name: "  CustomName  ",
            filters: { requireFresh: true, requireCompleted: false },
            targets: {}
        })

        expect(result).toEqual({
            guildId: "guild_reg",
            channelId: "chan_reg",
            webhookId: "wh_new",
            webhookUrl: "https://discord.com/api/webhooks/wh_new/tok_new",
            created: true,
            activated: false,
            rules: {
                players: { inserted: 0, updated: 0 },
                clans: { inserted: 0, updated: 0 }
            }
        })
    })
})
