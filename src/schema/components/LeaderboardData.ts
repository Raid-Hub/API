import { zInt64, zNaturalNumber } from "@/schema/output"
import { registry } from "@/schema/registry"
import { z } from "zod"
import { zPlayerInfo } from "./PlayerInfo"

export type TeamLeaderboardEntry = z.input<typeof zTeamLeaderboardEntry>
export const zTeamLeaderboardEntry = registry.register(
    "TeamLeaderboardEntry",
    z.object({
        position: zNaturalNumber(),
        rank: zNaturalNumber(),
        value: z.number(),
        instanceId: zInt64(),
        players: z.array(zPlayerInfo)
    })
)

export type IndividualLeaderboardEntry = z.input<typeof zIndividualLeaderboardEntry>
export const zIndividualLeaderboardEntry = registry.register(
    "IndividualLeaderboardEntry",
    z.object({
        position: zNaturalNumber(),
        rank: zNaturalNumber(),
        value: z.number(),
        playerInfo: zPlayerInfo
    })
)

/** Route response schema; registered via route's registerResponse(path, schema), not here. */
export type LeaderboardData<T extends "team" | "individual"> = z.input<typeof zLeaderboardData> & {
    type: T
}
export const zLeaderboardData = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("team"),
        format: z.enum(["duration", "numerical"]),
        page: zNaturalNumber(),
        count: zNaturalNumber(),
        entries: z.array(zTeamLeaderboardEntry)
    }),
    z.object({
        type: z.literal("individual"),
        format: z.enum(["duration", "numerical"]),
        page: zNaturalNumber(),
        count: zNaturalNumber(),
        entries: z.array(zIndividualLeaderboardEntry)
    })
])
