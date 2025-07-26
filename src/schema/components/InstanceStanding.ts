import { registry } from "@/schema/registry"
import { zISODateString, zInt64, zNaturalNumber, zWholeNumber } from "@/schema/util"
import { z } from "zod"
import { zPlayerInfo } from "./PlayerInfo"

enum ReportSource {
    Manual = "Manual",
    CheatCheck = "CheatCheck",
    WebReport = "WebReport",
    BlacklistedPlayerCascade = "BlacklistedPlayerCascade"
}

enum CheatFlagIndex {
    Manual,
    Leviathan,
    EaterOfWorlds,
    SpireOfStars,
    LastWish,
    ScourgeOfThePast,
    CrownOfSorrow,
    GardenOfSalvation,
    DeepStoneCrypt,
    VaultOfGlass,
    VowOfTheDisciple,
    KingsFall,
    RootOfNightmares,
    CrotasEnd,
    SalvationsEdge,
    Raid15,
    Raid16,
    Raid17,
    Raid18,
    Raid19,
    Raid20,
    Raid21,
    Raid22,
    Raid23,
    Raid24,
    Raid25,
    Raid26,
    Raid27,
    Raid28,
    Raid29,
    Raid30,
    Raid31,
    Raid32,
    Pantheon,
    Bit34,
    Bit35,
    Bit36,
    Bit37,
    Bit38,
    Bit39,
    Bit40,
    Bit41,
    Bit42,
    Bit43,
    Bit44,
    Bit45,
    Bit46,
    PlayerHeavyAmmoKills,
    FastLowmanCheckpoint,
    UnlikelyLowman,
    PlayerKillsShare,
    TimeDilation,
    FirstClear,
    Solo,
    TotalInstanceKills,
    TwoPlusCheaters,
    PlayerTotalKills,
    PlayerWeaponDiversity,
    PlayerSuperKills,
    PlayerGrenadeKills,
    TooFast,
    TooFewPlayersFresh,
    TooFewPlayersCheckpoint
}

export type CheatCheckBitmask = z.infer<typeof zCheatCheckBitmask>
export const zCheatCheckBitmask = registry.register(
    "CheatCheckBitmask",
    zInt64().openapi({
        type: "string",
        format: "int64",
        description:
            "A bitmask of flagged heuristics:\n" +
            Object.entries(CheatFlagIndex)
                .filter((t): t is [string, CheatFlagIndex] => typeof t[1] === "number")
                .map(([key, value]) => `2^${value} = ${key}`)
                .join("\n")
    })
)

export type InstanceBlacklist = z.infer<typeof zInstanceBlacklist>
export const zInstanceBlacklist = registry.register(
    "InstanceBlacklist",
    z.object({
        instanceId: zInt64(),
        reportSource: z.nativeEnum(ReportSource),
        reportId: zNaturalNumber().nullable(),
        cheatCheckVersion: z.string().nullable(),
        reason: z.string(),
        createdAt: zISODateString()
    })
)

export type InstanceFlag = z.infer<typeof zInstanceFlag>
export const zInstanceFlag = registry.register(
    "InstanceFlag",
    z.object({
        flaggedAt: zISODateString(),
        cheatCheckVersion: z.string(),
        cheatProbability: z.number().nonnegative(),
        cheatCheckBitmask: zCheatCheckBitmask
    })
)

export type InstancePlayerFlag = z.infer<typeof zInstancePlayerFlag>
export const zInstancePlayerFlag = registry.register(
    "InstancePlayerFlag",
    z.object({
        flaggedAt: zISODateString(),
        cheatCheckVersion: z.string(),
        cheatProbability: z.number().nonnegative(),
        cheatCheckBitmask: zCheatCheckBitmask,
        instanceId: zInt64(),
        membershipId: zInt64()
    })
)

export type InstancePlayerStanding = z.infer<typeof zInstancePlayerStanding>
export const zInstancePlayerStanding = registry.register(
    "InstancePlayerStanding",
    z.object({
        playerInfo: zPlayerInfo,
        flags: z.array(zInstancePlayerFlag),
        clears: zWholeNumber(),
        completed: z.boolean(),
        timePlayedSeconds: zWholeNumber(),
        blacklistedInstances: z.array(
            z.object({
                instanceId: zInt64(),
                instanceDate: zISODateString(),
                reason: z.string(),
                individualReason: z.string(),
                createdAt: zISODateString()
            })
        ),
        otherRecentFlags: z.array(zInstancePlayerFlag)
    })
)
