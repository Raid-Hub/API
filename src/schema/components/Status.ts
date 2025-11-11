import { zISO8601DateString, zWholeNumber } from "@/schema/output"
import { registry } from "@/schema/registry"
import { z } from "zod"

export type LatestResolvedInstance = z.input<typeof zLatestResolvedInstance>
export const zLatestResolvedInstance = registry.register(
    "LatestResolvedInstance",
    z.object({
        dateCompleted: zISO8601DateString(),
        dateResolved: zISO8601DateString(),
        instanceId: z.string()
    })
)

export type AtlasStatus = z.input<typeof zAtlasStatus>
export const zAtlasStatus = registry.register(
    "AtlasStatus",
    z.object({
        status: z.enum(["Crawling", "Idle", "Offline"]),
        medianSecondsBehindNow: z.number().nonnegative().nullable(),
        estimatedCatchUpTimestamp: zISO8601DateString({ nullable: true }),
        latestResolvedInstance: zLatestResolvedInstance.nullable()
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
        estimatedBacklogEmptied: zISO8601DateString({ nullable: true })
    })
)
