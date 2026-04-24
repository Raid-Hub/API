import { zWholeNumber } from "@/schema/output"
import { registry } from "@/schema/registry"
import { z } from "zod"

const MAX_DISCORD_WEBHOOK_TARGETS = 250

export type DiscordWebhookBody = z.input<typeof zDiscordWebhookBody>
export const zDiscordWebhookBody = registry.register(
    "DiscordWebhookBody",
    z
        .object({
            name: z.string().min(1).max(80).optional(),
            filters: z
                .object({
                    requireFresh: z.boolean().optional(),
                    requireCompleted: z.boolean().optional(),
                    raid: zWholeNumber().optional()
                })
                .optional(),
            targets: z
                .object({
                    playerMembershipIds: z
                        .array(z.string().regex(/^\d+$/))
                        .max(MAX_DISCORD_WEBHOOK_TARGETS)
                        .optional(),
                    clanGroupIds: z
                        .array(z.string().regex(/^\d+$/))
                        .max(MAX_DISCORD_WEBHOOK_TARGETS)
                        .optional()
                })
                .optional()
        })
        .default({})
)

const zDiscordWebhookRulesUpsertSummary = z.object({
    players: z.object({
        inserted: z.number().int().nonnegative(),
        updated: z.number().int().nonnegative()
    }),
    clans: z.object({
        inserted: z.number().int().nonnegative(),
        updated: z.number().int().nonnegative()
    })
})

const zDiscordPlayerRule = z.object({
    membershipId: z.string().regex(/^\d+$/),
    requireFresh: z.boolean(),
    requireCompleted: z.boolean(),
    activityRaidBitmap: zWholeNumber(),
    raidId: zWholeNumber().nullable()
})

const zDiscordClanRule = z.object({
    groupId: z.string().regex(/^\d+$/),
    requireFresh: z.boolean(),
    requireCompleted: z.boolean(),
    activityRaidBitmap: zWholeNumber(),
    raidId: zWholeNumber().nullable()
})

export type DiscordWebhookPutResponse = z.input<typeof zDiscordWebhookPutResponse>
export const zDiscordWebhookPutResponse = registry.register(
    "DiscordWebhookPutResponse",
    z.object({
        guildId: z.string(),
        channelId: z.string(),
        webhookId: z.string(),
        webhookUrl: z.string().url().optional(),
        created: z.boolean(),
        activated: z.boolean(),
        updated: z.boolean(),
        rules: zDiscordWebhookRulesUpsertSummary
    })
)

export type DiscordWebhookDeleteResponse = z.input<typeof zDiscordWebhookDeleteResponse>
export const zDiscordWebhookDeleteResponse = registry.register(
    "DiscordWebhookDeleteResponse",
    z.object({
        deleted: z.boolean()
    })
)

export type DiscordWebhookStatusResponse = z.input<typeof zDiscordWebhookStatusResponse>
export const zDiscordWebhookStatusResponse = registry.register(
    "DiscordWebhookStatusResponse",
    z.discriminatedUnion("registered", [
        z.object({
            registered: z.literal(false)
        }),
        z.object({
            registered: z.literal(true),
            guildId: z.string(),
            channelId: z.string(),
            webhookId: z.string(),
            destinationActive: z.boolean(),
            consecutiveDeliveryFailures: zWholeNumber(),
            lastDeliverySuccessAt: z.string().nullable(),
            lastDeliveryFailureAt: z.string().nullable(),
            lastDeliveryError: z.string().nullable(),
            players: z.array(zDiscordPlayerRule),
            clans: z.array(zDiscordClanRule)
        })
    ])
)
