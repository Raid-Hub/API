import { PlayerInfo } from "../schema/components/PlayerInfo"
import {
    PlayerProfileActivityStats,
    PlayerProfileGlobalStats,
    WorldFirstEntry
} from "../schema/components/PlayerProfile"
import { postgres } from "../services/postgres"
import { playerProfileQueryTimer } from "../services/prometheus/metrics"
import { withHistogramTimer } from "../services/prometheus/util"

export const getPlayer = async (membershipId: bigint | string) => {
    return await postgres.queryRow<PlayerInfo>(
        `SELECT  
            membership_id::text AS "membershipId",
            membership_type AS "membershipType",
            icon_path AS "iconPath",
            display_name AS "displayName",
            bungie_global_display_name AS "bungieGlobalDisplayName",
            bungie_global_display_name_code AS "bungieGlobalDisplayNameCode",
            last_seen AS "lastSeen",
            is_private AS "isPrivate"
        FROM player 
        WHERE membership_id = $1::bigint`,
        {
            params: [membershipId]
        }
    )
}
export const getPlayerActivityStats = async (membershipId: bigint | string) => {
    return await withHistogramTimer(
        playerProfileQueryTimer,
        {
            method: "getPlayerActivityStats"
        },
        () =>
            postgres.queryRows<PlayerProfileActivityStats>(
                `SELECT 
                    activity_definition.id AS "activityId",
                    COALESCE(player_stats.fresh_clears, 0) AS "freshClears",
                    COALESCE(player_stats.clears, 0) AS "clears",
                    COALESCE(player_stats.sherpas, 0) AS "sherpas",
                    CASE WHEN fastest_instance_id IS NOT NULL 
                        THEN JSONB_BUILD_OBJECT(
                            'instanceId', fastest.instance_id::text,
                            'hash', fastest.hash,
                            'activityId', fastest_ah.activity_id,
                            'versionId', fastest_ah.version_id,
                            'completed', fastest.completed,
                            'playerCount', fastest.player_count,
                            'score', fastest.score,
                            'fresh', fastest.fresh,
                            'flawless', fastest.flawless,
                            'dateStarted', fastest.date_started,
                            'dateCompleted', fastest.date_completed,
                            'season', fastest.season_id,
                            'duration', fastest.duration,
                            'platformType', fastest.platform_type,
                            'isDayOne', date_completed < COALESCE(day_one_end, TIMESTAMP 'epoch'),
                            'isContest', date_completed < COALESCE(contest_end, TIMESTAMP 'epoch'),
                            'isWeekOne', date_completed < COALESCE(week_one_end, TIMESTAMP 'epoch')
                        ) 
                        ELSE NULL 
                    END as "fastestInstance"
                FROM activity_definition 
                LEFT JOIN player_stats ON activity_definition.id = player_stats.activity_id
                    AND player_stats.membership_id = $1::bigint 
                LEFT JOIN instance fastest ON player_stats.fastest_instance_id = fastest.instance_id
                LEFT JOIN activity_version fastest_ah ON fastest.hash = fastest_ah.hash
                ORDER BY activity_definition.id`,
                {
                    params: [membershipId],
                    fetchCount: 100
                }
            )
    )
}

export const getPlayerGlobalStats = async (membershipId: bigint | string) => {
    return await withHistogramTimer(
        playerProfileQueryTimer,
        {
            method: "getPlayerGlobalStats"
        },
        () =>
            postgres.queryRow<PlayerProfileGlobalStats>(
                `SELECT
                    JSONB_BUILD_OBJECT(
                        'value', clears,
                        'rank', clears_rank
                    ) AS "clears",
                    JSONB_BUILD_OBJECT(
                        'value', fresh_clears,
                        'rank', fresh_clears_rank
                    ) AS "freshClears",
                    JSONB_BUILD_OBJECT(
                        'value', sherpas,
                        'rank', sherpas_rank
                    ) AS "sherpas",
                    CASE WHEN speed IS NOT NULL THEN JSONB_BUILD_OBJECT(
                        'value', speed,
                        'rank', speed_rank
                    ) ELSE NULL END AS "sumOfBest"
                FROM individual_global_leaderboard
                WHERE membership_id = $1::bigint`,
                {
                    params: [membershipId]
                }
            )
    )
}

export const getWorldFirstEntries = async (membershipId: bigint | string) => {
    return await withHistogramTimer(
        playerProfileQueryTimer,
        {
            method: "getWorldFirstEntries"
        },
        () =>
            postgres.queryRows<
                | WorldFirstEntry
                | {
                      activityId: bigint
                      rank: null
                      instanceId: null
                      timeAfterLaunch: null
                      isDayOne: boolean
                      isContest: boolean
                      isWeekOne: boolean
                      isChallengeMode: boolean
                  }
            >(
                `
                SELECT
                    activity_definition.id AS "activityId",
                    rank,
                    instance_id::text AS "instanceId",
                    time_after_launch AS "timeAfterLaunch",
                    (CASE WHEN instance_id IS NOT NULL THEN date_completed < COALESCE(day_one_end, TIMESTAMP 'epoch') ELSE false END) AS "isDayOne",
                    (CASE WHEN instance_id IS NOT NULL THEN date_completed < COALESCE(contest_end, TIMESTAMP 'epoch') ELSE false END) AS "isContest",
                    (CASE WHEN instance_id IS NOT NULL THEN date_completed < COALESCE(week_one_end, TIMESTAMP 'epoch') ELSE false END) AS "isWeekOne",
                    COALESCE(is_challenge_mode, false) AS "isChallengeMode"
                FROM activity_definition
                LEFT JOIN LATERAL (
                    SELECT instance_id, time_after_launch, date_completed, rank, is_challenge_mode
                    FROM world_first_contest_leaderboard
                    WHERE activity_id = activity_definition.id
                        AND membership_ids @> $1::jsonb
                        AND rank <= 500
                    ORDER BY rank ASC
                    LIMIT 1
                ) AS "__inner__" ON true
                WHERE is_raid = true
                ORDER BY activity_definition.id ASC;`,
                {
                    params: [`${[membershipId]}`],
                    fetchCount: 100
                }
            )
    )
}
