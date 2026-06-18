import { discordLrPublishTotal } from "@/integrations/prometheus/metrics"
import { discordRoleMetadataSyncQueue } from "@/integrations/rabbitmq/queues"
import { Logger } from "@/lib/utils/logging"

const logger = new Logger("DISCORD_LINKED_ROLES_ENQUEUE")

export type EnqueueManualLinkedRoleSyncResult =
    | { ok: true; destinyMembershipIds: string[] }
    | { ok: false; reason: "disabled" | "buffer_full" | "publish_failed" }

function linkedRolesEnabled(): boolean {
    const v = process.env.DISCORD_LINKED_ROLES_ENABLED?.trim().toLowerCase()
    return v === "true" || v === "1"
}

/** Publishes to `discord_role_metadata_sync`. Caller must pass every Destiny profile id for the Bungie user (e.g. Website loads from Prisma). */
export async function enqueueManualLinkedRoleSync(
    destinyMembershipIds: string[]
): Promise<EnqueueManualLinkedRoleSyncResult> {
    if (!linkedRolesEnabled()) {
        return { ok: false, reason: "disabled" }
    }
    if (destinyMembershipIds.length === 0) {
        discordLrPublishTotal.labels("fail").inc()
        return { ok: false, reason: "publish_failed" }
    }

    try {
        const sent = await discordRoleMetadataSyncQueue.sendJson({
            trigger: "account_linked_roles_sync",
            destinyMembershipIds,
            instanceId: 0
        })
        if (!sent) {
            discordLrPublishTotal.labels("fail").inc()
            logger.warn("DISCORD_LINKED_ROLES_ENQUEUE_BUFFER_FULL", null, {
                destiny_membership_id_count: destinyMembershipIds.length
            })
            return { ok: false, reason: "buffer_full" }
        }
        discordLrPublishTotal.labels("ok").inc()
        return { ok: true, destinyMembershipIds }
    } catch (err) {
        discordLrPublishTotal.labels("fail").inc()
        logger.error(
            "DISCORD_LINKED_ROLES_ENQUEUE_FAILED",
            err instanceof Error ? err : new Error(String(err)),
            { destiny_membership_id_count: destinyMembershipIds.length }
        )
        return { ok: false, reason: "publish_failed" }
    }
}
