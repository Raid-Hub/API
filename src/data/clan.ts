import { ClanStats } from "../schema/components/Clan"
import { postgres } from "../services/postgres"

export const getClanStats = async (
    groupId: string | bigint,
    membershipIds: bigint[] | string[]
) => {
    const clanStats = await postgres.queryRow<ClanStats>(
        `WITH "membership_ids" AS (
            SELECT unnest($1)::bigint AS membership_id
        ),
        "ranked_scores" AS (
            SELECT 
                "membership_id",
                COALESCE(wpr."score", 0) AS "score",
                ROW_NUMBER() OVER (ORDER BY wpr."score" DESC) AS "intra_clan_ranking"
            FROM membership_ids
            LEFT JOIN "world_first_player_rankings" wpr USING (membership_id)
        ),
        "member_stats" AS (
            SELECT 
                JSONB_BUILD_OBJECT(
                    'playerInfo', CASE WHEN player IS NULL THEN NULL ELSE JSONB_BUILD_OBJECT(
                        'membershipId', player."membership_id"::text,
                        'membershipType', player."membership_type",
                        'iconPath', player."icon_path",
                        'displayName', player."display_name",
                        'bungieGlobalDisplayName', player."bungie_global_display_name",
                        'bungieGlobalDisplayNameCode', player."bungie_global_display_name_code",
                        'lastSeen', player."last_seen",
                        'isPrivate', player."is_private"
                    ) END,
                    'stats', JSONB_BUILD_OBJECT(
                        'clears', COALESCE(player."clears", 0),
                        'freshClears',  COALESCE(player."fresh_clears", 0),
                        'sherpas',  COALESCE(player."sherpas", 0),
                        'totalTimePlayedSeconds', COALESCE(player."total_time_played_seconds", 0),
                        'contestScore', COALESCE(rs."score", 0)
                    )
                ) as "playerInfo"
            FROM membership_ids
            LEFT JOIN player USING (membership_id)
            LEFT JOIN ranked_scores rs USING (membership_id)
        ),
        "clan_ranks" AS (
            SELECT 
                group_id,
                RANK() OVER (ORDER BY clan_leaderboard."clears" DESC) AS "clears_rank",
                RANK() OVER (ORDER BY clan_leaderboard."fresh_clears" DESC) AS "fresh_clears_rank",
                RANK() OVER (ORDER BY clan_leaderboard."sherpas" DESC) AS "sherpas_rank",
                RANK() OVER (ORDER BY clan_leaderboard."time_played_seconds" DESC) AS "time_played_seconds_rank",
                RANK() OVER (ORDER BY clan_leaderboard."total_contest_score" DESC) AS "total_contest_score_rank",  
                RANK() OVER (ORDER BY clan_leaderboard."weighted_contest_score" DESC) AS "weighted_contest_score_rank"
            FROM clan_leaderboard
        )
        SELECT
            JSONB_BUILD_OBJECT(
                'clears', clan_leaderboard."clears",
                'clearsRank', clan_ranks."clears_rank",
                'averageClears', ROUND(clan_leaderboard."average_clears"),
                'freshClears', clan_leaderboard."fresh_clears",
                'freshClearsRank', clan_ranks."fresh_clears_rank",
                'averageFreshClears', ROUND(clan_leaderboard."average_fresh_clears"),
                'sherpas', clan_leaderboard."sherpas",
                'sherpasRank', clan_ranks."sherpas_rank",
                'averageSherpas', ROUND(clan_leaderboard."average_sherpas"),
                'timePlayedSeconds', clan_leaderboard."time_played_seconds",
                'timePlayedSecondsRank', clan_ranks."time_played_seconds_rank",
                'averageTimePlayedSeconds', ROUND(clan_leaderboard."average_time_played_seconds"),
                'totalContestScore', clan_leaderboard."total_contest_score",
                'totalContestScoreRank', clan_ranks."total_contest_score_rank",
                'weightedContestScore', ROUND(clan_leaderboard."weighted_contest_score"),
                'weightedContestScoreRank', clan_ranks."weighted_contest_score_rank"
            ) AS "aggregateStats",
            JSONB_BUILD_OBJECT(
                'members', member_stats."members"
            ) AS "memberStats"
            FROM clan_leaderboard
            LEFT JOIN clan_ranks ON clan_leaderboard."group_id" = clan_ranks."group_id"
            LEFT JOIN LATERAL (SELECT JSONB_AGG(member_stats."playerInfo") AS "members" FROM "member_stats") AS member_stats ON true
            WHERE clan_leaderboard."group_id" = $2`,
        {
            params: [membershipIds, groupId]
        }
    )
    if (!clanStats) {
        throw new TypeError("Unexpected null value")
    }

    return clanStats
}
