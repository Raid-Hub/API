import { pgReader } from "@/integrations/postgres"
import { convertStringToBigInt, convertStringToDate } from "@/integrations/postgres/parsers"
import { Teammate } from "@/schema/components/Teammate"

export const getTeammates = async (membershipId: bigint | string, { count }: { count: number }) => {
    return await pgReader.queryRows<Teammate>(
        `WITH self AS (
            SELECT 
                instance_id, time_played_seconds, completed
            FROM instance_player
            WHERE membership_id = $1::bigint
        ), agg_data AS (
            SELECT 
                membership_id, 
                SUM(LEAST(teammate.time_played_seconds, self.time_played_seconds)) AS time_played, 
                SUM(CASE WHEN teammate.completed AND self.completed THEN 1 ELSE 0 END) AS clears,
                COUNT(*) AS count 
            FROM self
            JOIN instance_player AS teammate USING (instance_id)
            WHERE membership_id <> $1::bigint
            GROUP BY (membership_id)
            ORDER BY clears DESC, time_played DESC
            LIMIT $2
        )
        SELECT  
            agg_data.time_played::int as "estimatedTimePlayedSeconds",
            agg_data.clears::int,
            agg_data.count::int as "instanceCount",
            JSONB_BUILD_OBJECT(
                'membershipId', "membership_id"::text, 
                'membershipType', "membership_type", 
                'iconPath', "icon_path", 
                'displayName', "display_name", 
                'bungieGlobalDisplayName', "bungie_global_display_name", 
                'bungieGlobalDisplayNameCode', "bungie_global_display_name_code", 
                'lastSeen', "last_seen"::text,
                'isPrivate', "is_private",
                'cheatLevel', cheat_level
            ) AS "playerInfo"
        FROM agg_data
        JOIN player USING (membership_id);`,
        {
            params: [membershipId, count],
            transformers: {
                playerInfo: { membershipId: convertStringToBigInt, lastSeen: convertStringToDate }
            }
        }
    )
}
