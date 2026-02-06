import { zISO8601DateString, zInt64 } from "@/schema/output"
import { registry } from "@/schema/registry"
import { z } from "zod"
import { zInstancePlayerFlag } from "./InstanceStanding"
import { zPlayerInfo } from "./PlayerInfo"

export type PlayerStandingFlag = z.infer<typeof zPlayerStandingFlag>
export const zPlayerStandingFlag = registry.register(
    "PlayerStandingFlag",
    zInstancePlayerFlag.extend({
        instanceDate: zISO8601DateString()
    })
)

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

export type PlayerStandingResponse = z.infer<typeof zPlayerStandingResponse>
export const zPlayerStandingResponse = registry.register(
    "PlayerStandingResponse",
    z.object({
        playerInfo: zPlayerInfo,
        recentFlags: z.array(zPlayerStandingFlag),
        blacklistedInstances: z.array(zPlayerBlacklistedInstance)
    })
)
