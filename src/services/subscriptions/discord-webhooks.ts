import { pgAdmin } from "@/integrations/postgres"
import { Logger } from "@/lib/utils/logging"

const logger = new Logger("DISCORD_SUBSCRIPTIONS_SERVICE")

export class DiscordWebhookMissingPermissionsError extends Error {
    constructor(channelId: string) {
        super(`Discord bot lacks permissions to create a webhook in channel ${channelId}`)
        this.name = "DiscordWebhookMissingPermissionsError"
    }
}

export type DiscordWebhookPlayerTargetInput = {
    membershipId: string
    requireFresh?: boolean
    requireCompleted?: boolean
    raids?: number[]
}

export type DiscordWebhookClanTargetInput = {
    groupId: string
    requireFresh?: boolean
    requireCompleted?: boolean
    raids?: number[]
}

export type RegisterDiscordWebhookInput = {
    guildId: string
    channelId: string
    name?: string
    targets?: {
        players?: DiscordWebhookPlayerTargetInput[]
        clans?: DiscordWebhookClanTargetInput[]
    }
}

export type RegisterDiscordWebhookResult = {
    guildId: string
    channelId: string
    webhookId: string
    webhookUrl: string
    created: boolean
    activated: boolean
    rules: {
        players: {
            inserted: number
            updated: number
        }
        clans: {
            inserted: number
            updated: number
        }
    }
}

export type UpdateDiscordWebhookInput = {
    guildId: string
    targets?: {
        players?: DiscordWebhookPlayerTargetInput[]
        clans?: DiscordWebhookClanTargetInput[]
    }
}

export type UpdateDiscordWebhookResult = {
    guildId: string
    channelId: string
    updated: boolean
    rules: {
        players: {
            inserted: number
            updated: number
        }
        clans: {
            inserted: number
            updated: number
        }
    }
}

export type UpsertDiscordWebhookInput = RegisterDiscordWebhookInput

export type UpsertDiscordWebhookResult = {
    guildId: string
    channelId: string
    webhookId: string
    webhookUrl?: string
    created: boolean
    activated: boolean
    updated: boolean
    rules: RegisterDiscordWebhookResult["rules"]
}

const createDiscordWebhook = async (
    body: Pick<RegisterDiscordWebhookInput, "channelId" | "name">
) => {
    const token = process.env.DISCORD_BOT_TOKEN
    if (!token) {
        throw new Error("DISCORD_BOT_TOKEN is not configured")
    }

    // Keep webhook identity aligned with RaidHub-Services defaults.
    const defaultWebhookName = "RaidHub"
    const requestedName = body.name?.trim()
    const webhookName =
        requestedName && requestedName.length > 0 ? requestedName.slice(0, 80) : defaultWebhookName

    const response = await fetch(
        `https://discord.com/api/v10/channels/${body.channelId}/webhooks`,
        {
            method: "POST",
            headers: {
                Authorization: `Bot ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: webhookName
            })
        }
    )

    if (!response.ok) {
        const detail = await response.text()
        if (response.status === 403) {
            logger.warn("DISCORD_WEBHOOK_CREATE_FORBIDDEN", null, {
                channelId: body.channelId,
                detail
            })
            throw new DiscordWebhookMissingPermissionsError(body.channelId)
        }
        throw new Error(`Discord webhook create failed with status ${response.status}: ${detail}`)
    }

    const data = (await response.json()) as { id: string; token: string }
    return {
        id: data.id,
        token: data.token,
        url: `https://discord.com/api/webhooks/${data.id}/${data.token}`
    }
}

/** Best-effort cleanup when DB persistence fails after Discord accepted create. */
const deleteDiscordWebhookApi = async (webhookId: string) => {
    const token = process.env.DISCORD_BOT_TOKEN
    if (!token) return

    const response = await fetch(`https://discord.com/api/v10/webhooks/${webhookId}`, {
        method: "DELETE",
        headers: { Authorization: `Bot ${token}` }
    })

    if (!response.ok && response.status !== 404) {
        const detail = await response.text()
        logger.warn("DISCORD_WEBHOOK_ORPHAN_CLEANUP_FAILED", null, {
            webhookId,
            status: response.status,
            detail
        })
    }
}

const validateDiscordWebhookUrl = (raw: string) => {
    const value = raw.trim()
    if (!value) throw new Error("webhookUrl is empty")
    const isDiscord =
        value.startsWith("https://discord.com/api/webhooks/") ||
        value.startsWith("https://discordapp.com/api/webhooks/")
    if (!isDiscord) {
        throw new Error("webhookUrl must be a Discord Incoming Webhook URL")
    }
    return value
}

const toBigIntString = (value: string) => BigInt(value).toString()

type ResolvedPlayerRuleRow = {
    membershipId: string
    requireFresh: boolean
    requireCompleted: boolean
    activityRaidBitmap: number
}

type ResolvedClanRuleRow = {
    groupId: string
    requireFresh: boolean
    requireCompleted: boolean
    activityRaidBitmap: number
}

const subscriptionRaidBitForActivityID = (activityId: number): number => {
    if (activityId === 101) return 2 ** 33
    return 2 ** activityId
}

const raidIdsFromBitmap = (bitmap: number): number[] => {
    if (!Number.isFinite(bitmap) || bitmap <= 0) return []
    const b = BigInt(Math.trunc(bitmap))
    const ids: number[] = []
    let idx = 0n
    let v = b
    while (v > 0n) {
        if ((v & 1n) === 1n) {
            if (idx >= 1n && idx <= 32n) ids.push(Number(idx))
            else if (idx === 33n) ids.push(101)
        }
        v >>= 1n
        idx += 1n
    }
    return ids
}

const resolveActivityRaidBitmap = async (raidIds?: number[]): Promise<number> => {
    if (!raidIds || raidIds.length === 0) return 0
    const ids = [...new Set(raidIds)]
    const rows = await pgAdmin.queryRows<{ id: number }>(
        `SELECT id::int AS id
         FROM definitions.activity_definition
         WHERE id = ANY($1::int[])
           AND is_raid`,
        { params: [ids] }
    )
    if (rows.length === 0) return 0
    // Use numeric addition, not `|`: bitwise OR coerces operands to int32 and corrupts bits past 2**31.
    return rows.reduce((bitmap, row) => bitmap + subscriptionRaidBitForActivityID(row.id), 0)
}

/** Dedupes identical raid lists across many targets in one PUT (one DB round-trip per unique list). */
type RaidBitmapResolutionCache = Map<string, Promise<number>>

const RAID_BITMAP_CACHE_EMPTY = "__empty__"

const raidBitmapCacheKey = (raidIds?: number[]): string => {
    if (!raidIds || raidIds.length === 0) return RAID_BITMAP_CACHE_EMPTY
    return [...new Set(raidIds)].sort((a, b) => a - b).join(",")
}

const resolveActivityRaidBitmapCached = async (
    raidIds: number[] | undefined,
    cache: RaidBitmapResolutionCache
): Promise<number> => {
    const key = raidBitmapCacheKey(raidIds)
    if (key === RAID_BITMAP_CACHE_EMPTY) return 0
    let pending = cache.get(key)
    if (!pending) {
        pending = resolveActivityRaidBitmap(raidIds)
        cache.set(key, pending)
    }
    return pending
}

const dedupePlayerTargets = (
    players: DiscordWebhookPlayerTargetInput[]
): DiscordWebhookPlayerTargetInput[] => {
    const map = new Map<string, DiscordWebhookPlayerTargetInput>()
    for (const raw of players) {
        const id = toBigIntString(String(raw.membershipId).trim())
        map.set(id, { ...raw, membershipId: id })
    }
    return [...map.values()].sort((a, b) =>
        BigInt(a.membershipId) < BigInt(b.membershipId) ? -1 : 1
    )
}

const dedupeClanTargets = (
    clans: DiscordWebhookClanTargetInput[]
): DiscordWebhookClanTargetInput[] => {
    const map = new Map<string, DiscordWebhookClanTargetInput>()
    for (const raw of clans) {
        const id = toBigIntString(String(raw.groupId).trim())
        map.set(id, { ...raw, groupId: id })
    }
    return [...map.values()].sort((a, b) => (BigInt(a.groupId) < BigInt(b.groupId) ? -1 : 1))
}

const resolvePlayerRuleRows = async (
    players: DiscordWebhookPlayerTargetInput[] | undefined,
    raidBitmapCache: RaidBitmapResolutionCache
): Promise<ResolvedPlayerRuleRow[] | undefined> => {
    if (players === undefined) return undefined
    const deduped = dedupePlayerTargets(players)
    const out: ResolvedPlayerRuleRow[] = []
    for (const p of deduped) {
        out.push({
            membershipId: p.membershipId,
            requireFresh: p.requireFresh ?? false,
            requireCompleted: p.requireCompleted ?? false,
            activityRaidBitmap: await resolveActivityRaidBitmapCached(p.raids, raidBitmapCache)
        })
    }
    return out
}

const resolveClanRuleRows = async (
    clans: DiscordWebhookClanTargetInput[] | undefined,
    raidBitmapCache: RaidBitmapResolutionCache
): Promise<ResolvedClanRuleRow[] | undefined> => {
    if (clans === undefined) return undefined
    const deduped = dedupeClanTargets(clans)
    const out: ResolvedClanRuleRow[] = []
    for (const c of deduped) {
        out.push({
            groupId: c.groupId,
            requireFresh: c.requireFresh ?? false,
            requireCompleted: c.requireCompleted ?? false,
            activityRaidBitmap: await resolveActivityRaidBitmapCached(c.raids, raidBitmapCache)
        })
    }
    return out
}

/** Prior Discord webhook id for this channel, if any (used before replacing on re-register). */
async function getExistingDiscordWebhookIdForChannel(channelId: string): Promise<string | null> {
    const row = await pgAdmin.queryRow<{ webhookId: string | null }>(
        `SELECT webhook_id::text AS "webhookId"
         FROM subscriptions.discord_destination_config
         WHERE channel_id = $1
         LIMIT 1`,
        { params: [channelId] }
    )
    const id = row?.webhookId
    return id && id.length > 0 ? id : null
}

async function getDiscordDestinationIdByChannelId(
    db: Pick<typeof pgAdmin, "queryRow" | "queryRows">,
    channelId: string
): Promise<string> {
    const row = await db.queryRow<{ destinationId: string }>(
        `SELECT destination_id::text AS "destinationId"
         FROM subscriptions.discord_destination_config
         WHERE channel_id = $1
         LIMIT 1`,
        { params: [channelId] }
    )
    if (!row) {
        throw new Error(`Discord channel ${channelId} not found`)
    }
    return row.destinationId
}

async function upsertDiscordRules(
    db: Pick<typeof pgAdmin, "queryRow" | "queryRows">,
    destinationId: string,
    options: {
        players?: ResolvedPlayerRuleRow[]
        clans?: ResolvedClanRuleRow[]
    }
) {
    const { players, clans } = options
    const playerInsertResults: { inserted: number; updated: number }[] = []

    for (const row of players ?? []) {
        const { membershipId, requireFresh, requireCompleted, activityRaidBitmap } = row
        const insertedRows = await db.queryRows<{ rowCount: number }>(
            `INSERT INTO subscriptions.rule (
                destination_id,
                scope,
                membership_id,
                require_fresh,
                require_completed,
                activity_raid_bitmap
            )
             SELECT $1::bigint, 'player', $2::bigint, $3, $4, $5::bigint
             WHERE NOT EXISTS (
                 SELECT 1 FROM subscriptions.rule r
                 WHERE r.destination_id = $1::bigint
                   AND r.scope = 'player'
                   AND r.membership_id = $2::bigint
                   AND r.is_active
             )
             RETURNING 1 AS "rowCount"`,
            {
                params: [
                    destinationId,
                    membershipId,
                    requireFresh,
                    requireCompleted,
                    activityRaidBitmap
                ]
            }
        )

        if (insertedRows.length > 0) {
            playerInsertResults.push({ inserted: 1, updated: 0 })
            continue
        }

        await db.queryRows(
            `UPDATE subscriptions.rule
             SET require_fresh = $3,
                 require_completed = $4,
                 activity_raid_bitmap = $5::bigint,
                 updated_at = NOW()
             WHERE destination_id = $1::bigint
               AND scope = 'player'
               AND membership_id = $2::bigint
               AND is_active`,
            {
                params: [
                    destinationId,
                    membershipId,
                    requireFresh,
                    requireCompleted,
                    activityRaidBitmap
                ]
            }
        )
        playerInsertResults.push({ inserted: 0, updated: 1 })
    }

    if (players !== undefined) {
        const playerIds = players.map(p => p.membershipId)
        await db.queryRows(
            `UPDATE subscriptions.rule
             SET is_active = false,
                 updated_at = NOW()
             WHERE destination_id = $1::bigint
               AND scope = 'player'
               AND is_active
               AND (
                    array_length($2::bigint[], 1) IS NULL
                    OR membership_id <> ALL($2::bigint[])
               )`,
            { params: [destinationId, playerIds] }
        )
    }

    const clanInsertResults: { inserted: number; updated: number }[] = []
    for (const row of clans ?? []) {
        const { groupId, requireFresh, requireCompleted, activityRaidBitmap } = row
        const insertedRows = await db.queryRows<{ rowCount: number }>(
            `INSERT INTO subscriptions.rule (
                destination_id,
                scope,
                group_id,
                require_fresh,
                require_completed,
                activity_raid_bitmap
            )
             SELECT $1::bigint, 'clan', $2::bigint, $3, $4, $5::bigint
             WHERE NOT EXISTS (
                 SELECT 1 FROM subscriptions.rule r
                 WHERE r.destination_id = $1::bigint
                   AND r.scope = 'clan'
                   AND r.group_id = $2::bigint
                   AND r.is_active
             )
             RETURNING 1 AS "rowCount"`,
            {
                params: [destinationId, groupId, requireFresh, requireCompleted, activityRaidBitmap]
            }
        )

        if (insertedRows.length > 0) {
            clanInsertResults.push({ inserted: 1, updated: 0 })
            continue
        }

        await db.queryRows(
            `UPDATE subscriptions.rule
             SET require_fresh = $3,
                 require_completed = $4,
                 activity_raid_bitmap = $5::bigint,
                 updated_at = NOW()
             WHERE destination_id = $1::bigint
               AND scope = 'clan'
               AND group_id = $2::bigint
               AND is_active`,
            {
                params: [destinationId, groupId, requireFresh, requireCompleted, activityRaidBitmap]
            }
        )
        clanInsertResults.push({ inserted: 0, updated: 1 })
    }

    if (clans !== undefined) {
        const groupIds = clans.map(c => c.groupId)
        await db.queryRows(
            `UPDATE subscriptions.rule
             SET is_active = false,
                 updated_at = NOW()
             WHERE destination_id = $1::bigint
               AND scope = 'clan'
               AND is_active
               AND (
                    array_length($2::bigint[], 1) IS NULL
                    OR group_id <> ALL($2::bigint[])
               )`,
            { params: [destinationId, groupIds] }
        )
    }

    return {
        players: {
            inserted: playerInsertResults.filter(r => r.inserted === 1).length,
            updated: playerInsertResults.filter(r => r.updated === 1).length
        },
        clans: {
            inserted: clanInsertResults.filter(r => r.inserted === 1).length,
            updated: clanInsertResults.filter(r => r.updated === 1).length
        }
    }
}

type PgWrite = Pick<typeof pgAdmin, "queryRow" | "queryRows">

async function updateDiscordWebhookInDb(
    tx: PgWrite,
    channelId: string,
    input: UpdateDiscordWebhookInput,
    normalized: {
        players?: ResolvedPlayerRuleRow[]
        clans?: ResolvedClanRuleRow[]
    }
): Promise<RegisterDiscordWebhookResult["rules"]> {
    const { players, clans } = normalized
    const destinationId = await getDiscordDestinationIdByChannelId(tx, channelId)
    const existing = await tx.queryRow<{ id: string }>(
        `SELECT id::text AS "id"
         FROM subscriptions.destination
         WHERE id = $1::bigint
         LIMIT 1`,
        { params: [destinationId] }
    )
    if (!existing) {
        throw new Error(`Subscription destination ${destinationId} not found`)
    }

    await tx.queryRows(
        `UPDATE subscriptions.discord_destination_config
             SET guild_id = $2,
                 updated_at = NOW()
             WHERE destination_id = $1::bigint`,
        { params: [destinationId, input.guildId] }
    )

    return upsertDiscordRules(tx, destinationId, { players, clans })
}

export async function registerDiscordWebhook(
    input: RegisterDiscordWebhookInput
): Promise<RegisterDiscordWebhookResult> {
    logger.info("DISCORD_WEBHOOK_REGISTER_REQUESTED", {
        guildId: input.guildId,
        channelId: input.channelId,
        hasName: Boolean(input.name),
        playerTargets: input.targets?.players?.length ?? 0,
        clanTargets: input.targets?.clans?.length ?? 0
    })
    let createdWebhook: { id: string; token: string; url: string } | null = null
    try {
        const priorWebhookId = await getExistingDiscordWebhookIdForChannel(input.channelId)
        if (priorWebhookId) {
            await deleteDiscordWebhookApi(priorWebhookId)
        }

        createdWebhook = await createDiscordWebhook({
            channelId: input.channelId,
            name: input.name
        })
        const webhookUrl = validateDiscordWebhookUrl(createdWebhook.url)
        const raidBitmapCache: RaidBitmapResolutionCache = new Map()
        const players = await resolvePlayerRuleRows(input.targets?.players, raidBitmapCache)
        const clans = await resolveClanRuleRows(input.targets?.clans, raidBitmapCache)

        const { created, activated, rules } = await pgAdmin.transaction(async tx => {
            const webhook = createdWebhook!
            const existing = await tx.queryRow<{ id: string; isActive: boolean }>(
                `SELECT d.id::text AS "id", d.is_active AS "isActive"
             FROM subscriptions.discord_destination_config c
             INNER JOIN subscriptions.destination d ON d.id = c.destination_id
             WHERE c.channel_id = $1
             LIMIT 1`,
                { params: [input.channelId] }
            )

            let destinationId: string
            let created = false
            let activated = false
            if (existing) {
                destinationId = existing.id
                if (!existing.isActive) {
                    await tx.queryRows(
                        `UPDATE subscriptions.destination
                     SET is_active = true,
                         updated_at = NOW(),
                         deactivated_at = NULL,
                         deactivation_reason = NULL
                     WHERE id = $1::bigint`,
                        { params: [existing.id] }
                    )
                    activated = true
                }
            } else {
                const inserted = await tx.queryRow<{ id: string }>(
                    `INSERT INTO subscriptions.destination (channel_type)
                 VALUES ($1)
                 RETURNING id::text AS "id"`,
                    { params: ["discord_webhook"] }
                )
                if (!inserted) throw new Error("Failed to create subscription destination")
                destinationId = inserted.id
                created = true
            }

            await tx.queryRows(
                `INSERT INTO subscriptions.discord_destination_config
                (destination_id, guild_id, channel_id, webhook_id, webhook_token, updated_at)
             VALUES ($1::bigint, $2, $3, $4, $5, NOW())
             ON CONFLICT (destination_id)
             DO UPDATE SET
                guild_id = EXCLUDED.guild_id,
                channel_id = EXCLUDED.channel_id,
                webhook_id = EXCLUDED.webhook_id,
                webhook_token = EXCLUDED.webhook_token,
                updated_at = NOW()`,
                {
                    params: [
                        destinationId,
                        input.guildId,
                        input.channelId,
                        webhook.id,
                        webhook.token
                    ]
                }
            )

            const rules = await upsertDiscordRules(tx, destinationId, { players, clans })

            return { created, activated, rules }
        })

        const webhook = createdWebhook

        logger.info("DISCORD_WEBHOOK_REGISTER_COMPLETED", {
            guildId: input.guildId,
            channelId: input.channelId,
            webhookId: webhook.id,
            created,
            activated,
            playerRulesInserted: rules.players.inserted,
            playerRulesUpdated: rules.players.updated,
            clanRulesInserted: rules.clans.inserted,
            clanRulesUpdated: rules.clans.updated
        })

        return {
            guildId: input.guildId,
            channelId: input.channelId,
            webhookId: webhook.id,
            webhookUrl,
            created,
            activated,
            rules
        }
    } catch (error) {
        if (createdWebhook !== null) {
            await deleteDiscordWebhookApi(createdWebhook.id).catch(() => undefined)
        }
        throw error
    }
}

export async function updateDiscordWebhook(
    channelId: string,
    input: UpdateDiscordWebhookInput
): Promise<UpdateDiscordWebhookResult> {
    logger.info("DISCORD_WEBHOOK_UPDATE_REQUESTED", {
        guildId: input.guildId,
        channelId,
        playerTargets: input.targets?.players?.length ?? 0,
        clanTargets: input.targets?.clans?.length ?? 0
    })
    const raidBitmapCache: RaidBitmapResolutionCache = new Map()
    const players = await resolvePlayerRuleRows(input.targets?.players, raidBitmapCache)
    const clans = await resolveClanRuleRows(input.targets?.clans, raidBitmapCache)

    const rules = await pgAdmin.transaction(async tx =>
        updateDiscordWebhookInDb(tx, channelId, input, { players, clans })
    )

    logger.info("DISCORD_WEBHOOK_UPDATE_COMPLETED", {
        guildId: input.guildId,
        channelId,
        playerRulesInserted: rules.players.inserted,
        playerRulesUpdated: rules.players.updated,
        clanRulesInserted: rules.clans.inserted,
        clanRulesUpdated: rules.clans.updated
    })

    return {
        guildId: input.guildId,
        channelId,
        updated: true,
        rules
    }
}

export async function upsertDiscordWebhook(
    input: UpsertDiscordWebhookInput
): Promise<UpsertDiscordWebhookResult> {
    logger.info("DISCORD_WEBHOOK_UPSERT_REQUESTED", {
        guildId: input.guildId,
        channelId: input.channelId
    })
    const existing = await pgAdmin.queryRow<{
        destinationId: string
        webhookId: string
        isActive: boolean
    }>(
        `SELECT c.destination_id::text AS "destinationId", c.webhook_id AS "webhookId", d.is_active AS "isActive"
         FROM subscriptions.discord_destination_config c
         INNER JOIN subscriptions.destination d ON d.id = c.destination_id
         WHERE c.channel_id = $1
         LIMIT 1`,
        { params: [input.channelId] }
    )

    if (!existing) {
        const reg = await registerDiscordWebhook(input)
        logger.info("DISCORD_WEBHOOK_UPSERT_REGISTERED", {
            guildId: reg.guildId,
            channelId: reg.channelId,
            webhookId: reg.webhookId
        })
        return {
            guildId: reg.guildId,
            channelId: reg.channelId,
            webhookId: reg.webhookId,
            webhookUrl: reg.webhookUrl,
            created: reg.created,
            activated: reg.activated,
            updated: false,
            rules: reg.rules
        }
    }

    const raidBitmapCache: RaidBitmapResolutionCache = new Map()
    const players = await resolvePlayerRuleRows(input.targets?.players, raidBitmapCache)
    const clans = await resolveClanRuleRows(input.targets?.clans, raidBitmapCache)

    const { rules, activated } = await pgAdmin.transaction(async tx => {
        let activatedInner = false
        if (!existing.isActive) {
            await tx.queryRows(
                `UPDATE subscriptions.destination
             SET is_active = true,
                 updated_at = NOW(),
                 deactivated_at = NULL,
                 deactivation_reason = NULL
             WHERE id = $1::bigint`,
                { params: [existing.destinationId] }
            )
            activatedInner = true
            logger.info("DISCORD_WEBHOOK_REACTIVATED", {
                destinationId: existing.destinationId,
                channelId: input.channelId
            })
        }

        const rulesInner = await updateDiscordWebhookInDb(tx, input.channelId, input, {
            players,
            clans
        })

        return { rules: rulesInner, activated: activatedInner }
    })

    return {
        guildId: input.guildId,
        channelId: input.channelId,
        webhookId: existing.webhookId,
        created: false,
        activated,
        updated: true,
        rules
    }
}

export async function deleteDiscordWebhook(channelId: string): Promise<void> {
    logger.info("DISCORD_WEBHOOK_DELETE_REQUESTED", { channelId })
    await pgAdmin.transaction(async tx => {
        const destinationId = await getDiscordDestinationIdByChannelId(tx, channelId)
        await tx.queryRows(
            `UPDATE subscriptions.destination
             SET is_active = false, updated_at = NOW(), deactivated_at = NOW(), deactivation_reason = 'api_deactivate'
             WHERE id = $1::bigint`,
            { params: [destinationId] }
        )
        logger.info("DISCORD_WEBHOOK_DEACTIVATED", {
            channelId,
            destinationId
        })
    })
}

const toIsoString = (value: unknown): string | null => {
    if (value == null) return null
    if (value instanceof Date) return value.toISOString()
    if (typeof value === "string") return value
    return String(value)
}

export type DiscordWebhookStatusResult =
    | { registered: false }
    | {
          registered: true
          guildId: string
          channelId: string
          webhookId: string
          destinationActive: boolean
          consecutiveDeliveryFailures: number
          lastDeliverySuccessAt: string | null
          lastDeliveryFailureAt: string | null
          lastDeliveryError: string | null
          players: {
              membershipId: string
              requireFresh: boolean
              requireCompleted: boolean
              raidIds: number[]
          }[]
          clans: {
              groupId: string
              requireFresh: boolean
              requireCompleted: boolean
              raidIds: number[]
          }[]
      }

export async function getDiscordWebhookStatus(
    channelId: string
): Promise<DiscordWebhookStatusResult> {
    logger.debug("DISCORD_WEBHOOK_STATUS_REQUESTED", { channelId })
    const row = await pgAdmin.queryRow<{
        destinationId: string
        destinationActive: boolean
        consecutiveDeliveryFailures: number
        lastDeliverySuccessAt: Date | null
        lastDeliveryFailureAt: Date | null
        lastDeliveryError: string | null
        guildId: string
        channelId: string
        webhookId: string
    }>(
        `SELECT
            d.id::text AS "destinationId",
            d.is_active AS "destinationActive",
            d.consecutive_delivery_failures AS "consecutiveDeliveryFailures",
            d.last_delivery_success_at AS "lastDeliverySuccessAt",
            d.last_delivery_failure_at AS "lastDeliveryFailureAt",
            d.last_delivery_error AS "lastDeliveryError",
            c.guild_id AS "guildId",
            c.channel_id AS "channelId",
            c.webhook_id AS "webhookId"
         FROM subscriptions.discord_destination_config c
         INNER JOIN subscriptions.destination d ON d.id = c.destination_id
         WHERE c.channel_id = $1
         LIMIT 1`,
        { params: [channelId] }
    )

    if (!row) {
        logger.info("DISCORD_WEBHOOK_STATUS_NOT_REGISTERED", { channelId })
        return { registered: false }
    }

    const [playerRows, clanRows] = await Promise.all([
        pgAdmin.queryRows<{
            membershipId: string
            requireFresh: boolean
            requireCompleted: boolean
            activityRaidBitmap: number
        }>(
            `SELECT
                membership_id::text AS "membershipId",
                require_fresh AS "requireFresh",
                require_completed AS "requireCompleted",
                activity_raid_bitmap::bigint AS "activityRaidBitmap"
             FROM subscriptions.rule
             WHERE destination_id = $1::bigint AND scope = 'player' AND is_active
             ORDER BY membership_id`,
            { params: [row.destinationId] }
        ),
        pgAdmin.queryRows<{
            groupId: string
            requireFresh: boolean
            requireCompleted: boolean
            activityRaidBitmap: number
        }>(
            `SELECT
                group_id::text AS "groupId",
                require_fresh AS "requireFresh",
                require_completed AS "requireCompleted",
                activity_raid_bitmap::bigint AS "activityRaidBitmap"
             FROM subscriptions.rule
             WHERE destination_id = $1::bigint AND scope = 'clan' AND is_active
             ORDER BY group_id`,
            { params: [row.destinationId] }
        )
    ])

    const mapRaidIds = (bitmap: number): number[] => raidIdsFromBitmap(Number(bitmap ?? 0))

    const status = {
        registered: true,
        guildId: row.guildId,
        channelId: row.channelId,
        webhookId: row.webhookId,
        destinationActive: row.destinationActive,
        consecutiveDeliveryFailures: row.consecutiveDeliveryFailures,
        lastDeliverySuccessAt: toIsoString(row.lastDeliverySuccessAt),
        lastDeliveryFailureAt: toIsoString(row.lastDeliveryFailureAt),
        lastDeliveryError: row.lastDeliveryError,
        players: playerRows.map(r => ({
            membershipId: r.membershipId,
            requireFresh: r.requireFresh,
            requireCompleted: r.requireCompleted,
            raidIds: mapRaidIds(Number(r.activityRaidBitmap ?? 0))
        })),
        clans: clanRows.map(r => ({
            groupId: r.groupId,
            requireFresh: r.requireFresh,
            requireCompleted: r.requireCompleted,
            raidIds: mapRaidIds(Number(r.activityRaidBitmap ?? 0))
        }))
    }
    logger.info("DISCORD_WEBHOOK_STATUS_FETCHED", {
        channelId,
        destinationActive: status.destinationActive,
        playerRules: status.players.length,
        clanRules: status.clans.length
    })
    return status
}
