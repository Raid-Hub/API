import { pgReader } from "@/integrations/postgres"
import { ClanStats } from "@/schema/components/Clan"

export const getClanStats = async (
    groupId: string | bigint,
    membershipIds: bigint[] | string[]
) => {
    const clanStats = await pgReader.queryRow<ClanStats>(
        `WITH "membership_ids" AS (
            SELECT unnest($1::bigint[]) AS membership_id
        ),
        "ranked_scores" AS (
            SELECT 
                "membership_id",
                COALESCE(player."wfr_score", 0) AS "score",
                ROW_NUMBER() OVER (ORDER BY player."wfr_score" DESC) AS "intra_clan_ranking"
            FROM membership_ids
            LEFT JOIN player USING (membership_id)
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
                        'isPrivate', player."is_private",
                        'cheatLevel', player."cheat_level"
                    ) END,
                    'stats', JSONB_BUILD_OBJECT(
                        'clears', COALESCE(player."clears", 0),
                        'freshClears',  COALESCE(player."fresh_clears", 0),
                        'sherpas',  COALESCE(player."sherpas", 0),
                        'totalTimePlayedSeconds', COALESCE(player."total_time_played_seconds", 0),
                        'contestScore', COALESCE(rs."score", 0)
                    )
                ) as "_member"
            FROM membership_ids
            LEFT JOIN player USING (membership_id)
            LEFT JOIN ranked_scores rs USING (membership_id)
        ),
        "live_aggregates" AS (
            SELECT 
                SUM(("_member"->'stats'->>'clears')::int) AS clears,
                AVG(("_member"->'stats'->>'clears')::int) AS average_clears,
                SUM(("_member"->'stats'->>'freshClears')::int) AS fresh_clears,
                AVG(("_member"->'stats'->>'freshClears')::int) AS average_fresh_clears,
                SUM(("_member"->'stats'->>'sherpas')::int) AS sherpas,
                AVG(("_member"->'stats'->>'sherpas')::int) AS average_sherpas,
                SUM(("_member"->'stats'->>'totalTimePlayedSeconds')::int) AS time_played_seconds,
                AVG(("_member"->'stats'->>'totalTimePlayedSeconds')::int) AS average_time_played_seconds,
                SUM(("_member"->'stats'->>'contestScore')::DOUBLE PRECISION) AS total_contest_score
            FROM "member_stats"
        ),
        "clan_ranks" AS (
            SELECT 
                group_id,
                weighted_contest_score,
                RANK() OVER (ORDER BY clan_leaderboard."clears" DESC) AS "clears_rank",
                RANK() OVER (ORDER BY clan_leaderboard."fresh_clears" DESC) AS "fresh_clears_rank",
                RANK() OVER (ORDER BY clan_leaderboard."sherpas" DESC) AS "sherpas_rank",
                RANK() OVER (ORDER BY clan_leaderboard."time_played_seconds" DESC) AS "time_played_seconds_rank",
                RANK() OVER (ORDER BY clan_leaderboard."total_contest_score" DESC) AS "total_contest_score_rank",  
                RANK() OVER (ORDER BY clan_leaderboard."weighted_contest_score" DESC) AS "weighted_contest_score_rank"
            FROM clan_leaderboard
        )
        SELECT
            _member_stats."members",
            JSONB_BUILD_OBJECT(
                'ranks', CASE WHEN clan_ranks IS NOT NULL THEN JSONB_BUILD_OBJECT(
                    'clearsRank', clan_ranks."clears_rank",
                    'freshClearsRank', clan_ranks."fresh_clears_rank",
                    'sherpasRank', clan_ranks."sherpas_rank",
                    'timePlayedSecondsRank', clan_ranks."time_played_seconds_rank",
                    'totalContestScoreRank', clan_ranks."total_contest_score_rank",
                    'weightedContestScoreRank', clan_ranks."weighted_contest_score_rank"
                ) ELSE NULL END,
                'stats', JSONB_BUILD_OBJECT(
                    'clears', COALESCE("live_aggregates"."clears", 0),
                    'averageClears', ROUND(COALESCE("live_aggregates"."average_clears", 0)),
                    'freshClears', COALESCE("live_aggregates"."fresh_clears", 0),
                    'averageFreshClears', ROUND(COALESCE("live_aggregates"."average_fresh_clears", 0)),
                    'sherpas', COALESCE("live_aggregates"."sherpas", 0),
                    'averageSherpas', ROUND(COALESCE("live_aggregates"."average_sherpas", 0)),
                    'timePlayedSeconds', COALESCE("live_aggregates"."time_played_seconds", 0),
                    'averageTimePlayedSeconds', ROUND(COALESCE("live_aggregates"."average_time_played_seconds", 0)),
                    'totalContestScore', COALESCE("live_aggregates"."total_contest_score", 0),
                    'weightedContestScore', ROUND(COALESCE(clan_ranks."weighted_contest_score", 0))
                )
            ) AS "aggregateStats"
        FROM (SELECT JSONB_AGG(member_stats."_member") AS "members" FROM "member_stats") AS "_member_stats"
        CROSS JOIN "live_aggregates"
        LEFT JOIN clan_ranks ON clan_ranks."group_id" = $2::bigint`,
        [membershipIds, groupId]
    )

    if (!clanStats) {
        throw new TypeError("Unexpected null result from clan stats query")
    }

    return clanStats
}
