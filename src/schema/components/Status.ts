import { z } from "zod"
import { registry } from ".."
import { zISODateString, zWholeNumber } from "../util"

export type LatestResolvedInstance = z.input<typeof zLatestResolvedInstance>
export const zLatestResolvedInstance = registry.register(
    "LatestResolvedInstance",
    z.object({
        dateCompleted: zISODateString(),
        dateResolved: zISODateString(),
        instanceId: z.string()
    })
)

export type AtlasStatus = z.input<typeof zAtlasStatus>
export const zAtlasStatus = registry.register(
    "AtlasStatus",
    z.object({
        status: z.enum(["Crawling", "Idle", "Offline"]),
        medianSecondsBehindNow: z.number().nonnegative().nullable(),
        estimatedCatchUpTimestamp: zISODateString({ nullable: true }),
        latestResolvedInstance: zLatestResolvedInstance
    })
)

export type FloodgatesStatus = z.input<typeof zFloodgatesStatus>
export const zFloodgatesStatus = registry.register(
    "FloodgatesStatus",
    z.object({
        status: z.enum(["Empty", "Blocked", "Crawling", "Live"]),
        incomingRate: z.number().nonnegative(),
        resolveRate: z.number().nonnegative(),
        backlog: zWholeNumber(),
        latestResolvedInstance: zLatestResolvedInstance.nullable(),
        estimatedBacklogEmptied: zISODateString({ nullable: true })
    })
)
