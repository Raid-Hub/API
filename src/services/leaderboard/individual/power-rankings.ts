import { postgres } from "@/integrations/postgres"
import { IndividualLeaderboardEntry } from "@/schema/components/LeaderboardData"

export const getIndividualWorldFirstPowerRankingsLeaderboard = async ({
    skip,
    take
}: {
    skip: number
    take: number
}) => {
    return await postgres.queryRows<IndividualLeaderboardEntry>(
        `SELECT
            world_first_player_rankings.position,
            world_first_player_rankings.rank,
            ROUND(world_first_player_rankings.score::numeric, 3) AS "value",
            JSONB_BUILD_OBJECT(
                'membershipId', membership_id::text,
                'membershipType', membership_type,
                'iconPath', icon_path,
                'displayName', display_name,
                'bungieGlobalDisplayName', bungie_global_display_name,
                'bungieGlobalDisplayNameCode', bungie_global_display_name_code,
                'lastSeen', last_seen,
                'isPrivate', is_private
            ) as "playerInfo"
        FROM world_first_player_rankings
        JOIN player USING (membership_id)
        WHERE position > $1 AND position <= ($1 + $2)
        ORDER BY position ASC`,
        {
            params: [skip, take],
            fetchCount: take
        }
    )
}

export const searchIndividualWorldFirstPowerRankingsLeaderboard = async ({
    membershipId,
    take
}: {
    membershipId: bigint | string
    take: number
}) => {
    const result = await postgres.queryRow<{ position: number }>(
        `SELECT position
        FROM world_first_player_rankings 
        WHERE membership_id = $1::bigint
        ORDER BY position ASC
        LIMIT 1`,
        {
            params: [membershipId]
        }
    )
    if (!result) return null

    const page = Math.ceil(result.position / take)
    return {
        page,
        entries: await getIndividualWorldFirstPowerRankingsLeaderboard({
            skip: (page - 1) * take,
            take
        })
    }
}
