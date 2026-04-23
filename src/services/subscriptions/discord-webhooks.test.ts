import { afterAll, beforeEach, describe, expect, test } from "bun:test"

import { pgAdmin } from "@/integrations/postgres"
import {
    deleteDiscordWebhook,
    getDiscordWebhookStatus,
    registerDiscordWebhook,
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

    test("upsertDiscordWebhook updates existing active destination", async () => {
        queueQueryRow([
            {
                destinationId: "99",
                webhookId: "webhook_abc",
                isActive: true
            },
            {
                destinationId: "99"
            },
            {
                id: "99"
            }
        ])
        queueQueryRows([[]])
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
            },
            {
                destinationId: "77"
            },
            {
                id: "77"
            }
        ])
        queueQueryRows([[], []])
        queueTransaction([{ destinationId: "77" }, { id: "77" }], [[]])

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
                    requireCompleted: false
                }
            ],
            [
                {
                    groupId: "123456",
                    requireFresh: false,
                    requireCompleted: true
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
                    requireCompleted: false
                }
            ],
            clans: [
                {
                    groupId: "123456",
                    requireFresh: false,
                    requireCompleted: true
                }
            ]
        })
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

    test("upsertDiscordWebhook registers when channel has no destination yet", async () => {
        process.env.DISCORD_BOT_TOKEN = "fake-token"
        globalThis.fetch = async () =>
            new Response(JSON.stringify({ id: "wh_ups", token: "tok_ups" }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            })

        queueQueryRow([null])
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

    test("registerDiscordWebhook creates new destination when channel is new", async () => {
        process.env.DISCORD_BOT_TOKEN = "fake-token"
        globalThis.fetch = async () =>
            new Response(JSON.stringify({ id: "wh_new", token: "tok_new" }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            })

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
