import { createClient, type Client } from "@libsql/client"
import { Logger } from "@/lib/utils/logging"

const logger = new Logger("DISCORD_ACCOUNT_LOOKUP")

let tursoClient: Client | null = null

/** Shared libsql client for NextAuth Turso (`account`, `destiny_profile`, …). */
export function getRaidHubAccountTursoClient(): Client | null {
    const url = process.env.RAIDHUB_ACCOUNT_TURSO_URL?.trim()
    if (!url) {
        return null
    }
    if (!tursoClient) {
        tursoClient = createClient({ url })
    }
    return tursoClient
}

/**
 * Resolve a Discord snowflake to the linked RaidHub / Bungie membership id (NextAuth `account.userId`).
 * Returns null when Turso is not configured, the account is not linked, or the lookup fails.
 */
export async function lookupBungieMembershipIdForDiscordUser(
    discordUserId: string
): Promise<string | null> {
    const trimmed = discordUserId.trim()
    if (!trimmed) {
        return null
    }

    const client = getRaidHubAccountTursoClient()
    if (!client) {
        return null
    }

    try {
        const result = await client.execute({
            sql: `SELECT bungie_membership_id AS mid FROM account WHERE provider = 'discord' AND provider_account_id = ? LIMIT 1`,
            args: [trimmed]
        })
        const row = result.rows[0] as Record<string, unknown> | undefined
        if (!row) {
            return null
        }
        const mid = row.mid ?? row["mid"]
        if (mid === null || mid === undefined) {
            return null
        }
        const s = String(mid).trim()
        return s.length > 0 ? s : null
    } catch (err) {
        logger.warn(
            "DISCORD_ACCOUNT_LOOKUP_FAILED",
            err instanceof Error ? err : new Error(String(err)),
            { discordUserId: trimmed }
        )
        return null
    }
}
