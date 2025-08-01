import { zDestinyMembershipType } from "@/schema/enums/DestinyMembershipType"
import { registry } from "@/schema/registry"
import { zInt64, zISODateString, zNaturalNumber, zUInt32, zWholeNumber } from "@/schema/util"
import { z } from "zod"

const zInstancePrimitive = z.object({
    instanceId: zInt64(),
    hash: zUInt32(),
    completed: z.boolean(),
    flawless: z.boolean().nullable(),
    fresh: z.boolean().nullable(),
    playerCount: zNaturalNumber(),
    skullHashes: z.array(
        zUInt32().openapi({
            description: "Mapped to a FeatDefinition by its skullHash"
        })
    ),
    score: zWholeNumber(),
    dateStarted: zISODateString(),
    dateCompleted: zISODateString(),
    season: zNaturalNumber(),
    duration: zNaturalNumber().openapi({
        description: "Instance duration in seconds"
    }),
    platformType: zDestinyMembershipType.openapi({
        description:
            "If all players are on the same platform, this will be the platform type. Otherwise, it will be `0`."
    })
})

export type Instance = z.input<typeof zInstance>
export const zInstance = registry.register(
    "Instance",
    zInstancePrimitive
        .extend({
            activityId: zNaturalNumber(),
            versionId: zNaturalNumber(),
            isDayOne: z.boolean().openapi({
                description: "If the instance was completed before the day one end date"
            }),
            isContest: z.boolean().openapi({
                description: "If the instance was completed before the contest end date"
            }),
            isWeekOne: z.boolean().openapi({
                description: "If the instance was completed before the week one end date"
            }),
            isBlacklisted: z.boolean().openapi({
                description: "If the instance is blacklisted from leaderboards"
            })
        })
        .strict()
)
export type InstanceBasic = z.input<typeof zInstanceBasic>
export const zInstanceBasic = registry.register(
    "InstanceBasic",
    zInstancePrimitive.extend({
        dateResolved: zISODateString()
    })
)
