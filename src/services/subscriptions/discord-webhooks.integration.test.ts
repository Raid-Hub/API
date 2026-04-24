import { getFixturePool } from "@/lib/test-fixture-db"
import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import {
    deleteDiscordWebhook,
    getDiscordWebhookStatus,
    updateDiscordWebhook,
    upsertDiscordWebhook
} from "./discord-webhooks"

/**
 * Exercises real SQL against migrated Postgres (same stack as CI).
 * Catches schema drift that mocked unit tests cannot see (e.g. missing columns on subscriptions.rule).
 */
describe("discord webhook subscriptions service (postgres integration)", () => {
    const fixtureDb = getFixturePool()

    const channelId = "999888777666555001"
    const guildIdA = "999888777666555002"
    const guildIdB = "999888777666555003"
    const membershipId = "4611686019000990990"

    let webhookSeq = 0
    const nextWebhookId = () => `wh_int_${Date.now()}_${webhookSeq++}`

    const deleteFixtureRows = async () => {
        await fixtureDb.query(
            `DELETE FROM subscriptions.destination
             WHERE id IN (
                 SELECT destination_id FROM subscriptions.discord_destination_config
                 WHERE channel_id = $1
             )`,
            [channelId]
        )
    }

    const seedActiveDestination = async () => {
        const res = await fixtureDb.query<{ id: string }>(
            `INSERT INTO subscriptions.destination (channel_type, is_active)
             VALUES ('discord_webhook', true)
             RETURNING id::text AS "id"`
        )
        const destinationId = res.rows[0].id
        const webhookId = nextWebhookId()
        await fixtureDb.query(
            `INSERT INTO subscriptions.discord_destination_config
                (destination_id, guild_id, channel_id, webhook_id, webhook_token)
             VALUES ($1::bigint, $2, $3, $4, $5)`,
            [destinationId, guildIdA, channelId, webhookId, `tok_${webhookId}`]
        )
        await fixtureDb.query(
            `INSERT INTO subscriptions.rule
                (destination_id, scope, membership_id, require_fresh, require_completed)
             VALUES ($1::bigint, 'player', $2::bigint, false, false)`,
            [destinationId, membershipId]
        )
        return { destinationId, webhookId }
    }

    beforeEach(async () => {
        await deleteFixtureRows()
    })

    afterAll(async () => {
        await deleteFixtureRows()
    })

    test("updateDiscordWebhook deactivates all player rules when targets.playerMembershipIds is empty", async () => {
        await seedActiveDestination()

        await updateDiscordWebhook(channelId, {
            guildId: guildIdA,
            targets: { playerMembershipIds: [] }
        })

        const row = await fixtureDb.query<{ n: string }>(
            `SELECT COUNT(*)::text AS n
             FROM subscriptions.rule r
             INNER JOIN subscriptions.discord_destination_config c ON c.destination_id = r.destination_id
             WHERE c.channel_id = $1 AND r.scope = 'player' AND r.is_active`,
            [channelId]
        )
        expect(row.rows[0].n).toBe("0")
    })

    test("updateDiscordWebhook persists guild_id and rule updates touch updated_at when column exists", async () => {
        await seedActiveDestination()

        await updateDiscordWebhook(channelId, {
            guildId: guildIdB,
            filters: { requireFresh: true, requireCompleted: true },
            targets: { playerMembershipIds: [membershipId] }
        })

        const cfg = await fixtureDb.query<{ guild_id: string }>(
            `SELECT guild_id FROM subscriptions.discord_destination_config WHERE channel_id = $1`,
            [channelId]
        )
        expect(cfg.rows[0].guild_id).toBe(guildIdB)

        const rule = await fixtureDb.query<{
            require_fresh: boolean
            require_completed: boolean
            updated_at: Date | null
        }>(
            `SELECT require_fresh, require_completed, r.updated_at AS updated_at
             FROM subscriptions.rule r
             INNER JOIN subscriptions.discord_destination_config c ON c.destination_id = r.destination_id
             WHERE c.channel_id = $1 AND r.scope = 'player' AND r.is_active
             LIMIT 1`,
            [channelId]
        )
        expect(rule.rows[0].require_fresh).toBe(true)
        expect(rule.rows[0].require_completed).toBe(true)
        expect(rule.rows[0].updated_at).not.toBeNull()
    })

    test("getDiscordWebhookStatus returns active player rules for seeded destination", async () => {
        await seedActiveDestination()

        const status = await getDiscordWebhookStatus(channelId)
        expect(status.registered).toBe(true)
        if (!status.registered) return
        expect(status.guildId).toBe(guildIdA)
        expect(status.channelId).toBe(channelId)
        expect(status.players.some(p => p.membershipId === membershipId)).toBe(true)
    })

    test("upsertDiscordWebhook updates existing row without Discord register path", async () => {
        await seedActiveDestination()

        const out = await upsertDiscordWebhook({
            guildId: guildIdB,
            channelId,
            filters: { requireFresh: false, requireCompleted: false },
            targets: {}
        })

        expect(out.created).toBe(false)
        expect(out.updated).toBe(true)
        expect(out.webhookUrl).toBeUndefined()

        const cfg = await fixtureDb.query<{ guild_id: string }>(
            `SELECT guild_id FROM subscriptions.discord_destination_config WHERE channel_id = $1`,
            [channelId]
        )
        expect(cfg.rows[0].guild_id).toBe(guildIdB)
    })

    test("deleteDiscordWebhook deactivates destination", async () => {
        await seedActiveDestination()

        await deleteDiscordWebhook(channelId)

        const row = await fixtureDb.query<{ active: boolean }>(
            `SELECT d.is_active AS active
             FROM subscriptions.destination d
             INNER JOIN subscriptions.discord_destination_config c ON c.destination_id = d.id
             WHERE c.channel_id = $1`,
            [channelId]
        )
        expect(row.rows[0].active).toBe(false)
    })
})
