import { Teammate } from "../schema/components/Teammate"
import { postgres } from "../services/postgres"

export const getTeammates = async (membershipId: bigint | string) => {
    return await postgres.queryRows<Teammate>(
        `WITH self AS (
            SELECT 
                instance_id, time_played_seconds, completed
            FROM activity_player
            WHERE membership_id = $1::bigint
        ), agg_data AS (
            SELECT 
                membership_id, 
                SUM(LEAST(teammate.time_played_seconds, self.time_played_seconds)) AS time_played, 
                SUM(CASE WHEN teammate.completed AND self.completed THEN 1 ELSE 0 END) AS clears,
                COUNT(*) AS count 
            FROM self
            JOIN activity_player AS teammate USING (instance_id)
            WHERE membership_id <> $1::bigint
            GROUP BY (membership_id)
        )
        SELECT  
            agg_data.time_played as "estimatedTimePlayedSeconds",
            agg_data.clears,
            agg_data.count as "instanceCount",
            JSONB_BUILD_OBJECT(
                'membershipId', "membership_id"::text, 
                'membershipType', "membership_type", 
                'iconPath', "icon_path", 
                'displayName', "display_name", 
                'bungieGlobalDisplayName', "bungie_global_display_name", 
                'bungieGlobalDisplayNameCode', "bungie_global_display_name_code", 
                'lastSeen', "last_seen",
                'isPrivate', "is_private"
            ) AS "playerInfo"
        FROM agg_data
        JOIN player USING (membership_id)
        ORDER BY clears DESC, time_played DESC
        LIMIT 100;`,
        {
            params: [membershipId],
            fetchCount: 100
        }
    )
}
