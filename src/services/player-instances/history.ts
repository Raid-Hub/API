import { pgReader } from "@/integrations/postgres"
import { convertUInt32Value } from "@/integrations/postgres/transformer"
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
            // Build parameters conditionally to avoid unused parameters
            const params: unknown[] = [membershipId, count]
            let paramIndex = 2

            if (cursor) {
                params.push(cursor)
            }
            if (cutoff) {
                params.push(cutoff)
            }

            return await pgReader.queryRows<InstanceForPlayer>(
                `SELECT
                    instance.instance_id AS "instanceId",
                    instance.hash AS "hash",
                    av.activity_id::int AS "activityId",
                    av.version_id::int AS "versionId",
                    instance.completed AS "completed",
                    instance.player_count::int AS "playerCount",
                    instance.score::int AS "score",
                    instance.fresh AS "fresh",
                    instance.flawless AS "flawless",
                    instance.skull_hashes AS "skullHashes",
                    instance.date_started AS "dateStarted",
                    instance.date_completed AS "dateCompleted",
                    instance.season_id::int AS "season",
                    instance.duration::int AS "duration",
                    instance.platform_type AS "platformType",
                    instance.date_completed < COALESCE(activity_definition.day_one_end, TIMESTAMP 'epoch') AS "isDayOne",
                    (
                        CASE
                            WHEN ph_cact.activity_id IS NOT NULL THEN (
                                av.version_id = 32
                                AND instance.date_completed < COALESCE(activity_definition.contest_end, TIMESTAMP 'epoch')
                            )
                            ELSE instance.date_completed < COALESCE(activity_definition.contest_end, TIMESTAMP 'epoch')
                        END
                    ) AS "isContest",
                    instance.date_completed < COALESCE(activity_definition.week_one_end, TIMESTAMP 'epoch') AS "isWeekOne",
                    (bi.instance_id IS NOT NULL AND NOT COALESCE(instance.is_whitelisted, false)) AS "isBlacklisted",
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
                LEFT JOIN (
                    SELECT DISTINCT avc.activity_id
                    FROM activity_version avc
                    WHERE avc.version_id = 32
                ) ph_cact ON ph_cact.activity_id = activity_definition.id
                WHERE membership_id = $1::bigint
                ${cursor ? `AND instance.date_completed < $${++paramIndex}` : ""}
                ${cutoff ? `AND instance.date_completed > $${++paramIndex}` : ""}
                ORDER BY instance.date_completed DESC
                LIMIT $2;`,
                // Note: the use of strictly less than is important because the cursor is the date of the last activity
                // that was fetched. If we used less than or equal to, we would fetch the same activity twice.
                {
                    params,
                    transformers: {
                        hash: convertUInt32Value,
                        skullHashes: convertUInt32Value
                    }
                }
            )
        }
    )
}
