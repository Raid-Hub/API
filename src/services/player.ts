import { pgReader } from "@/integrations/postgres"
import { convertStringToBigInt, convertStringToDate } from "@/integrations/postgres/transformer"
import { playerProfileQueryTimer } from "@/integrations/prometheus/metrics"
import { withHistogramTimer } from "@/integrations/prometheus/util"
import { PlayerInfo } from "@/schema/components/PlayerInfo"
import {
    PlayerProfileActivityStats,
    PlayerProfileGlobalStats,
    WorldFirstEntry
} from "@/schema/components/PlayerProfile"

export const getPlayer = async (membershipId: bigint | string) => {
    return await pgReader.queryRow<PlayerInfo>(
        `SELECT
            membership_id AS "membershipId",
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
        { params: [membershipId] }
    )
}
export const getPlayerActivityStats = async (membershipId: bigint | string) => {
    return await withHistogramTimer(
        playerProfileQueryTimer,
        {
            method: "getPlayerActivityStats"
        },
        () =>
            pgReader.queryRows<PlayerProfileActivityStats>(
                `SELECT
                    activity_definition.id::int AS "activityId",
                    COALESCE(player_stats.fresh_clears, 0)::int AS "freshClears",
                    COALESCE(player_stats.clears, 0)::int AS "clears",
                    COALESCE(player_stats.sherpas, 0)::int AS "sherpas",
                    CASE WHEN fastest_instance_id IS NOT NULL
                        THEN JSONB_BUILD_OBJECT(
                            'instanceId', fastest.instance_id::text,
                            'hash', fastest.hash,
                            'activityId', av.activity_id,
                            'versionId', av.version_id::int,
                            'completed', fastest.completed,
                            'playerCount', fastest.player_count::int,
                            'score', fastest.score::int,
                            'fresh', fastest.fresh,
                            'flawless', fastest.flawless,
                            'skullHashes', fastest.skull_hashes,
                            'dateStarted', fastest.date_started,
                            'dateCompleted', fastest.date_completed,
                            'season', fastest.season_id::int,
                            'duration', fastest.duration::int,
                            'platformType', fastest.platform_type,
                            'isDayOne', date_completed < COALESCE(day_one_end, TIMESTAMP 'epoch'),
                            'isContest', (
                                CASE
                                    WHEN fa_cact.activity_id IS NOT NULL THEN (
                                        av.version_id = 32
                                        AND fastest.date_completed < COALESCE(activity_definition.contest_end, TIMESTAMP 'epoch')
                                    )
                                    ELSE fastest.date_completed < COALESCE(activity_definition.contest_end, TIMESTAMP 'epoch')
                                END
                            ),
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
                LEFT JOIN (
                    SELECT DISTINCT av2.activity_id
                    FROM activity_version av2
                    WHERE av2.version_id = 32
                ) fa_cact ON fa_cact.activity_id = activity_definition.id
                ORDER BY activity_definition.id`,
                {
                    params: [membershipId],
                    transformers: {
                        fastestInstance: {
                            instanceId: convertStringToBigInt,
                            dateStarted: convertStringToDate,
                            dateCompleted: convertStringToDate
                        }
                    }
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
            pgReader.queryRow<PlayerProfileGlobalStats>(
                `SELECT
                    JSONB_BUILD_OBJECT(
                        'value', COALESCE(lb.clears, player.clears, 0)::int,
                        'rank', lb.clears_rank::int,
                        'percentile', lb.clears_percentile
                    ) AS "clears",
                    JSONB_BUILD_OBJECT(
                        'value', COALESCE(lb.fresh_clears, player.fresh_clears, 0)::int,
                        'rank', lb.fresh_clears_rank::int,
                        'percentile', lb.fresh_clears_percentile
                    ) AS "freshClears",
                    JSONB_BUILD_OBJECT(
                        'value', COALESCE(lb.sherpas, player.sherpas, 0)::int,
                        'rank', lb.sherpas_rank::int,
                        'percentile', lb.sherpas_percentile
                    ) AS "sherpas",
                    JSONB_BUILD_OBJECT(
                        'value', COALESCE(lb.total_time_played, player.total_time_played_seconds, 0)::int,
                        'rank', lb.total_time_played_rank::int,
                        'percentile', lb.total_time_played_percentile
                    ) AS "totalTimePlayed",
                    JSONB_BUILD_OBJECT(
                        'value', COALESCE(lb.speed, player.sum_of_best, 0)::int,
                        'rank', lb.speed_rank::int,
                        'percentile', lb.speed_percentile
                    ) AS "sumOfBest",
                    JSONB_BUILD_OBJECT(
                        'value', COALESCE(lb.wfr_score, player.wfr_score, 0),
                        'rank', lb.wfr_score_rank::int,
                        'percentile', lb.wfr_score_percentile
                    ) AS "contest"
                FROM player
                LEFT JOIN individual_global_leaderboard lb USING (membership_id)
                WHERE membership_id = $1::bigint`,
                { params: [membershipId] }
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
            pgReader.queryRows<WorldFirstEntry>(
                `
                SELECT DISTINCT ON (activity_definition.id)
                    activity_definition.id::int AS "activityId",
                    wf.rank::int AS "rank",
                    wf.instance_id AS "instanceId",
                    wf.time_after_launch::int AS "timeAfterLaunch",
                    (CASE WHEN wf.instance_id IS NOT NULL THEN wf.date_completed < COALESCE(activity_definition.day_one_end, TIMESTAMP 'epoch') ELSE false END) AS "isDayOne",
                    (
                        CASE
                            WHEN wf.instance_id IS NULL THEN false
                            WHEN wf_cact.activity_id IS NOT NULL THEN (
                                av.version_id = 32
                                AND i.date_completed < COALESCE(activity_definition.contest_end, TIMESTAMP 'epoch')
                            )
                            ELSE i.date_completed < COALESCE(activity_definition.contest_end, TIMESTAMP 'epoch')
                        END
                    ) AS "isContest",
                    (CASE WHEN wf.instance_id IS NOT NULL THEN wf.date_completed < COALESCE(activity_definition.week_one_end, TIMESTAMP 'epoch') ELSE false END) AS "isWeekOne",
                    COALESCE(wf.is_challenge_mode, false) AS "isChallengeMode"
                FROM world_first_contest_leaderboard wf
                JOIN activity_definition ON wf.activity_id = activity_definition.id
                LEFT JOIN instance i ON i.instance_id = wf.instance_id
                LEFT JOIN activity_version av ON av.hash = i.hash
                LEFT JOIN (
                    SELECT DISTINCT av2.activity_id
                    FROM activity_version av2
                    WHERE av2.version_id = 32
                ) wf_cact ON wf_cact.activity_id = activity_definition.id
                WHERE wf.membership_ids @> $1::jsonb
                    AND wf.rank <= 500
                    AND activity_definition.is_raid = true
                ORDER BY activity_definition.id ASC, wf.rank ASC;`,
                { params: [`${[membershipId]}`] }
            )
    )
}
