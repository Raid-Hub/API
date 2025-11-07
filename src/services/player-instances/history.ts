import { pgReader } from "@/integrations/postgres"
import { activityHistoryQueryTimer } from "@/integrations/prometheus/metrics"
import { withHistogramTimer } from "@/integrations/prometheus/util"
import { InstanceForPlayer } from "@/schema/components/InstanceForPlayer"

export const getActivities = async (
    membershipId: bigint | string,
    {
        count,
        cursor,
        cutoff
    }: {
        count: number
        cutoff?: Date
        cursor?: Date
    }
) => {
    return await withHistogramTimer(
        activityHistoryQueryTimer,
        {
            count: count,
            cursor: String(!!cursor),
            cutoff: String(!!cutoff)
        },
        async () => {
            const params = [membershipId, count, cursor ?? 0, cutoff ?? 0]

            return await pgReader.queryRows<InstanceForPlayer>(
                `SELECT 
                    instance_id::text AS "instanceId",
                    hash AS "hash",
                    activity_id::int AS "activityId",
                    version_id::int AS "versionId",
                    instance.completed AS "completed",
                    player_count::int AS "playerCount",
                    score::int AS "score",
                    fresh AS "fresh",
                    flawless AS "flawless",
                    skull_hashes AS "skullHashes",
                    date_started AS "dateStarted",
                    date_completed AS "dateCompleted",
                    season_id::int AS "season",
                    duration::int AS "duration",
                    platform_type AS "platformType",
                    CASE WHEN av.is_contest_eligible THEN date_completed < COALESCE(day_one_end, TIMESTAMP 'epoch') ELSE false END AS "isDayOne",
                    CASE WHEN av.is_contest_eligible THEN date_completed < COALESCE(contest_end, TIMESTAMP 'epoch') ELSE false END AS "isContest",
                    date_completed < COALESCE(week_one_end, TIMESTAMP 'epoch') AS "isWeekOne",
                    bi.instance_id IS NOT NULL AS "isBlacklisted",
                    JSONB_BUILD_OBJECT(
                        'completed', instance_player.completed,
                        'sherpas', instance_player.sherpas::int,
                        'isFirstClear', instance_player.is_first_clear,
                        'timePlayedSeconds', instance_player.time_played_seconds::int
                    ) as player
                FROM instance_player
                INNER JOIN instance USING (instance_id)
                LEFT JOIN blacklist_instance bi USING (instance_id)
                INNER JOIN activity_version av USING (hash)
                INNER JOIN activity_definition ON activity_definition.id = av.activity_id
                WHERE membership_id = $1::bigint
                ${cursor ? "AND date_completed < $3" : ""}
                ${cutoff ? "AND date_completed > $4" : ""}
                ORDER BY date_completed DESC
                LIMIT $2;`,
                // Note: the use of strictly less than is important because the cursor is the date of the last activity
                // that was fetched. If we used less than or equal to, we would fetch the same activity twice.
                params
            )
        }
    )
}
