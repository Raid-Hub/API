import { RaidHubRoute } from "@/core/RaidHubRoute"
import { timingSafeStringEqual } from "@/lib/timingSafeSecret"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zDigitString } from "@/schema/input"
import { enqueueManualLinkedRoleSync } from "@/services/discord-linked-roles/enqueue-manual-sync"
import { z } from "zod"

/**
 * Server-to-server: Website BFF enqueues Hermes linked-role metadata sync (same queue as new-instance path).
 * Requires header `x-raidhub-client-secret` (same value as API `CLIENT_SECRET`). Body lists every Destiny profile for the Bungie user
 * so Hermes can sum clears across all of them.
 */
export const queueDiscordLinkedRoleSyncRoute = new RaidHubRoute({
    method: "post",
    description:
        "Queue a Discord linked-role metadata sync. Body: Destiny membership ids only. Send `x-raidhub-client-secret: <CLIENT_SECRET>` (not in JSON). Refresh Discord OAuth in the BFF before calling.",
    body: z.object({
        destinyMembershipIds: z.array(zDigitString()).min(1)
    }),
    response: {
        success: {
            statusCode: 200,
            schema: z.object({
                queued: z.literal(true),
                destinyMembershipIds: z.array(z.string())
            })
        },
        errors: [
            {
                statusCode: 403,
                code: ErrorCode.InvalidClientSecretError,
                schema: z.object({})
            },
            {
                statusCode: 503,
                code: ErrorCode.ServiceUnavailableError,
                schema: z.object({
                    serviceName: z.string(),
                    message: z.string()
                })
            },
            {
                statusCode: 500,
                code: ErrorCode.InternalServerError,
                schema: z.object({
                    message: z.string()
                })
            }
        ]
    },
    async handler({ body, headers }) {
        const expected = process.env.CLIENT_SECRET
        if (expected === undefined || expected === "") {
            return RaidHubRoute.fail(ErrorCode.InternalServerError, {
                message: "Server CLIENT_SECRET is not configured"
            })
        }
        const headerRaw = headers["x-raidhub-client-secret"]
        const headerSecret = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw
        if (!timingSafeStringEqual(expected, headerSecret)) {
            return RaidHubRoute.fail(ErrorCode.InvalidClientSecretError, {})
        }

        const result = await enqueueManualLinkedRoleSync(body.destinyMembershipIds)

        if (result.ok) {
            return RaidHubRoute.ok({
                queued: true as const,
                destinyMembershipIds: result.destinyMembershipIds
            })
        }

        if (result.reason === "disabled") {
            return RaidHubRoute.fail(ErrorCode.ServiceUnavailableError, {
                serviceName: "discord_linked_roles",
                message: "Linked roles enqueue is disabled (DISCORD_LINKED_ROLES_ENABLED)"
            })
        }
        if (result.reason === "buffer_full") {
            return RaidHubRoute.fail(ErrorCode.ServiceUnavailableError, {
                serviceName: "discord_linked_roles",
                message: "RabbitMQ channel buffer full for discord_role_metadata_sync"
            })
        }
        return RaidHubRoute.fail(ErrorCode.InternalServerError, {
            message: "Failed to publish discord_role_metadata_sync message"
        })
    }
})
