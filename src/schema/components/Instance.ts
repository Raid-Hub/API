import { zDestinyMembershipType } from "@/schema/enums/DestinyMembershipType"
import { registry } from "@/schema/registry"
import { zInt64, zISODateString, zNaturalNumber, zUInt32, zWholeNumber } from "@/schema/util"
import { z } from "zod"

export type Instance = z.input<typeof zInstance>
export const zInstance = registry.register(
    "Instance",
    z
        .object({
            instanceId: zInt64(),
            hash: zUInt32(),
            activityId: zNaturalNumber(),
            versionId: zNaturalNumber(),
            completed: z.boolean(),
            flawless: z.boolean().nullable(),
            fresh: z.boolean().nullable(),
            playerCount: zNaturalNumber(),
            score: zWholeNumber(),
            dateStarted: zISODateString(),
            dateCompleted: zISODateString(),
            season: zNaturalNumber(),
            duration: zNaturalNumber().openapi({
                description: "Activity duration in seconds"
            }),
            platformType: zDestinyMembershipType.openapi({
                description:
                    "If all players are on the same platform, this will be the platform type. Otherwise, it will be `0`."
            }),
            isDayOne: z.boolean().openapi({
                description: "If the activity was completed before the day one end date"
            }),
            isContest: z.boolean().openapi({
                description: "If the activity was completed before the contest end date"
            }),
            isWeekOne: z.boolean().openapi({
                description: "If the activity was completed before the week one end date"
            })
        })
        .strict()
)
export type InstanceBasic = z.input<typeof zInstanceBasic>
export const zInstanceBasic = registry.register(
    "InstanceBasic",
    z.object({
        instanceId: zInt64(),
        hash: zUInt32(),
        completed: z.boolean(),
        playerCount: zNaturalNumber(),
        score: zWholeNumber(),
        fresh: z.boolean().nullable(),
        flawless: z.boolean().nullable(),
        dateStarted: zISODateString(),
        dateCompleted: zISODateString(),
        season: zNaturalNumber(),
        duration: zNaturalNumber(),
        platformType: zDestinyMembershipType.nullable(),
        dateResolved: zISODateString()
    })
)
