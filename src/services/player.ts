import { postgres } from "@/integrations/postgres"
import { playerProfileQueryTimer } from "@/integrations/prometheus/metrics"
import { withHistogramTimer } from "@/integrations/prometheus/util"
import { PlayerInfo } from "@/schema/components/PlayerInfo"
import {
    PlayerProfileActivityStats,
    PlayerProfileGlobalStats,
    WorldFirstEntry
} from "@/schema/components/PlayerProfile"

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
            is_private AS "isPrivate",
            cheat_level AS "cheatLevel"
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
                            'activityId', av.activity_id,
                            'versionId', av.version_id,
                            'completed', fastest.completed,
                            'playerCount', fastest.player_count,
                            'score', fastest.score,
                            'fresh', fastest.fresh,
                            'flawless', fastest.flawless,
                            'skullHashes', fastest.skull_hashes,
                            'dateStarted', fastest.date_started,
                            'dateCompleted', fastest.date_completed,
                            'season', fastest.season_id,
                            'duration', fastest.duration,
                            'platformType', fastest.platform_type,
                            'isDayOne', CASE WHEN av.is_contest_eligible THEN date_completed < COALESCE(day_one_end, TIMESTAMP 'epoch') ELSE false END,
                            'isContest', CASE WHEN av.is_contest_eligible THEN date_completed < COALESCE(contest_end, TIMESTAMP 'epoch') ELSE false END,
                            'isWeekOne', date_completed < COALESCE(week_one_end, TIMESTAMP 'epoch'),
                            'isBlacklisted', bi.instance_id IS NOT NULL
                        ) 
                        ELSE NULL 
                    END as "fastestInstance"
                FROM activity_definition 
                LEFT JOIN player_stats ON activity_definition.id = player_stats.activity_id
                    AND player_stats.membership_id = $1::bigint 
                LEFT JOIN instance fastest ON player_stats.fastest_instance_id = fastest.instance_id
                LEFT JOIN blacklist_instance bi ON player_stats.fastest_instance_id = bi.instance_id
                LEFT JOIN activity_version av ON fastest.hash = av.hash
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
                        'value', COALESCE(lb.clears, player.clears, 0),
                        'rank', lb.clears_rank,
                        'percentile', lb.clears_percentile
                    ) AS "clears",
                    JSONB_BUILD_OBJECT(
                        'value', COALESCE(lb.fresh_clears, player.fresh_clears, 0),
                        'rank', lb.fresh_clears_rank,
                        'percentile', lb.fresh_clears_percentile
                    ) AS "freshClears",
                    JSONB_BUILD_OBJECT(
                        'value', COALESCE(lb.sherpas, player.sherpas, 0),
                        'rank', lb.sherpas_rank,
                        'percentile', lb.sherpas_percentile
                    ) AS "sherpas",
                    JSONB_BUILD_OBJECT(
                        'value', COALESCE(lb.total_time_played, player.total_time_played_seconds, 0),
                        'rank', lb.total_time_played_rank,
                        'percentile', lb.total_time_played_percentile
                    ) AS "totalTimePlayed",
                    JSONB_BUILD_OBJECT(
                        'value', COALESCE(lb.speed, player.sum_of_best, 0),
                        'rank', lb.speed_rank,
                        'percentile', lb.speed_percentile
                    ) AS "sumOfBest",
                    JSONB_BUILD_OBJECT(
                        'value', COALESCE(lb.wfr_score, player.wfr_score, 0),
                        'rank', lb.wfr_score_rank,
                        'percentile', lb.wfr_score_percentile
                    ) AS "contest"
                FROM player
                LEFT JOIN individual_global_leaderboard lb USING (membership_id)
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
