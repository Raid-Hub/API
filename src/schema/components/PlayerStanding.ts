import { zISO8601DateString, zInt64 } from "@/schema/output"
import { registry } from "@/schema/registry"
import { z } from "zod"
import { zInstancePlayerFlag } from "./InstanceStanding"
import { zPlayerInfo } from "./PlayerInfo"

export type PlayerBlacklistedInstance = z.infer<typeof zPlayerBlacklistedInstance>
export const zPlayerBlacklistedInstance = registry.register(
    "PlayerBlacklistedInstance",
    z.object({
        instanceId: zInt64(),
        instanceDate: zISO8601DateString(),
        reason: z.string(),
        individualReason: z.string().nullable(),
        createdAt: zISO8601DateString()
    })
)

/** Route response schema; registered via route's registerResponse(path, schema), not here. */
export type PlayerStandingResponse = z.infer<typeof zPlayerStandingResponse>
export const zPlayerStandingResponse = z.object({
    playerInfo: zPlayerInfo,
    recentFlags: z.array(zInstancePlayerFlag),
    blacklistedInstances: z.array(zPlayerBlacklistedInstance)
})
