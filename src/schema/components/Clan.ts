import { registry } from "@/schema/registry"
import { zInt64, zISODateString, zNaturalNumber, zWholeNumber } from "@/schema/util"
import { z } from "zod"
import { zPlayerInfo } from "./PlayerInfo"

export type ClanBannerData = z.input<typeof zClanBannerData>
export const zClanBannerData = registry.register(
    "ClanBannerData",
    z
        .object({
            decalId: zWholeNumber(),
            decalColorId: zWholeNumber(),
            decalBackgroundColorId: zWholeNumber(),
            gonfalonId: zWholeNumber(),
            gonfalonColorId: zWholeNumber(),
            gonfalonDetailId: zWholeNumber(),
            gonfalonDetailColorId: zWholeNumber()
        })
        .strict()
)

export type Clan = z.input<typeof zClan>
export const zClan = registry.register(
    "Clan",
    z.object({
        groupId: zInt64(),
        name: z.string(),
        callSign: z.string(),
        motto: z.string(),
        clanBannerData: zClanBannerData,
        lastUpdated: zISODateString(),
        knownMemberCount: zNaturalNumber()
    })
)

export type ClanLeaderboardAggregateStats = z.input<typeof zClanLeaderboardAggregateStats>
export const zClanLeaderboardAggregateStats = registry.register(
    "ClanLeaderboardAggregateStats",
    z.object({
        clears: zWholeNumber(),
        averageClears: zWholeNumber(),
        freshClears: zWholeNumber(),
        averageFreshClears: zWholeNumber(),
        sherpas: zWholeNumber(),
        averageSherpas: zWholeNumber(),
        timePlayedSeconds: zWholeNumber(),
        averageTimePlayedSeconds: zWholeNumber(),
        totalContestScore: z.number().nonnegative(),
        weightedContestScore: z.number().nonnegative()
    })
)

export type ClanAggregateStats = z.input<typeof zClanAggregateStats>
export const zClanAggregateStats = registry.register(
    "ClanAggregateStats",
    z.object({
        stats: zClanLeaderboardAggregateStats,
        ranks: z
            .object({
                clearsRank: zNaturalNumber(),
                freshClearsRank: zNaturalNumber(),
                sherpasRank: zNaturalNumber(),
                timePlayedSecondsRank: zNaturalNumber(),
                totalContestScoreRank: zNaturalNumber(),
                weightedContestScoreRank: zNaturalNumber()
            })
            .nullable()
    })
)

export type ClanLeaderboardEntry = z.input<typeof zClanLeaderboardEntry>
export const zClanLeaderboardEntry = registry.register(
    "ClanLeaderboardEntry",
    z
        .object({
            clan: zClan
        })
        .merge(zClanLeaderboardAggregateStats)
)

export type ClanMemberStats = z.input<typeof zClanMemberStats>
export const zClanMemberStats = registry.register(
    "ClanMemberStats",
    z.object({
        clears: zWholeNumber(),
        freshClears: zWholeNumber(),
        sherpas: zWholeNumber(),
        totalTimePlayedSeconds: zWholeNumber(),
        contestScore: z.number().nonnegative()
    })
)

export type ClanStats = z.input<typeof zClanStats>
export const zClanStats = registry.register(
    "ClanStats",
    z.object({
        aggregateStats: zClanAggregateStats,
        members: z.array(
            z.object({
                playerInfo: zPlayerInfo.nullable(),
                stats: zClanMemberStats
            })
        )
    })
)
