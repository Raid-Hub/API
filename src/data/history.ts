import { InstanceForPlayer } from "@/schema/components/InstanceForPlayer"
import { postgres } from "@/services/postgres"
import { activityHistoryQueryTimer } from "@/services/prometheus/metrics"
import { withHistogramTimer } from "@/services/prometheus/util"

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
            const params: (string | number | bigint | Date)[] = [membershipId, count]
            if (cursor) params.push(cursor)
            if (cutoff) params.push(cutoff)

            return await postgres.queryRows<InstanceForPlayer>(
                `SELECT * FROM (
                    SELECT 
                        instance_id::text AS "instanceId",
                        hash AS "hash",
                        activity_id AS "activityId",
                        version_id AS "versionId",
                        instance.completed AS "completed",
                        player_count AS "playerCount",
                        score AS "score",
                        fresh AS "fresh",
                        flawless AS "flawless",
                        date_started AS "dateStarted",
                        date_completed AS "dateCompleted",
                        season_id AS "season",
                        duration AS "duration",
                        platform_type AS "platformType",
                        date_completed < COALESCE(day_one_end, TIMESTAMP 'epoch') AS "isDayOne",
                        date_completed < COALESCE(contest_end, TIMESTAMP 'epoch') AS "isContest",
                        date_completed < COALESCE(week_one_end, TIMESTAMP 'epoch') AS "isWeekOne",
                        JSONB_BUILD_OBJECT(
                            'completed', instance_player.completed,
                            'sherpas', instance_player.sherpas,
                            'isFirstClear', instance_player.is_first_clear,
                            'timePlayedSeconds', instance_player.time_played_seconds
                        ) as player
                    FROM instance_player
                    INNER JOIN instance USING (instance_id)
                    INNER JOIN activity_version USING (hash)
                    INNER JOIN activity_definition ON activity_definition.id = activity_version.activity_id
                    WHERE membership_id = $1::bigint
                    ${cursor ? "AND date_completed < $3" : ""}
                    ${cutoff ? `AND date_completed > ${cursor ? "$4" : "$3"}` : ""}
                    ORDER BY date_completed DESC
                    ${!cutoff ? "LIMIT $2" : ""}
                ) as __inner__   
                LIMIT $2;`,
                // Note: the use of strictly less than is important because the cursor is the date of the last activity
                // that was fetched. If we used less than or equal to, we would fetch the same activity twice.
                {
                    params: params,
                    fetchCount: count
                }
            )
        }
    )
}
