import { postgres } from "@/integrations/postgres"
import { TeamLeaderboardEntry } from "@/schema/components/LeaderboardData"

export const getFirstTeamActivityVersionLeaderboard = async ({
    activityId,
    versionId,
    skip,
    take
}: {
    activityId: number
    versionId: number
    skip: number
    take: number
}) => {
    return await postgres.queryRows<TeamLeaderboardEntry>(
        `SELECT
            position,
            rank,
            value,
            instance_id::text as "instanceId",
            "lateral".players
        FROM team_activity_version_leaderboard
        LEFT JOIN LATERAL (
            SELECT 
                JSONB_AGG(
                    JSONB_BUILD_OBJECT(
                        'membershipId', membership_id::text,
                        'membershipType', membership_type,
                        'iconPath', icon_path,
                        'displayName', display_name,
                        'bungieGlobalDisplayName', bungie_global_display_name,
                        'bungieGlobalDisplayNameCode', bungie_global_display_name_code,
                        'lastSeen', last_seen,
                        'isPrivate', is_private
                    )
                ) as "players"
            FROM instance_player
            INNER JOIN player USING (membership_id)
            WHERE instance_player.instance_id = team_activity_version_leaderboard.instance_id
                AND instance_player.completed
        ) as "lateral" ON true
        WHERE position > $1 AND position <= ($1 + $2)
            AND activity_id = $3 AND version_id = $4
        ORDER BY position ASC`,
        {
            params: [skip, take, activityId, versionId],
            fetchCount: take
        }
    )
}

export const searchFirstTeamActivityVersionLeaderboard = async ({
    activityId,
    versionId,
    membershipId,
    take
}: {
    activityId: number
    versionId: number
    membershipId: bigint | string
    take: number
}) => {
    const result = await postgres.queryRow<{ position: number }>(
        `SELECT position 
        FROM team_activity_version_leaderboard 
        WHERE membership_ids @> $1::jsonb
            AND activity_id = $2 AND version_id = $3
        ORDER BY position ASC
        LIMIT 1`,
        {
            params: [`${[membershipId]}`, activityId, versionId]
        }
    )
    if (!result) return null

    const page = Math.ceil(result.position / take)
    return {
        page,
        entries: await getFirstTeamActivityVersionLeaderboard({
            activityId,
            versionId,
            skip: (page - 1) * take,
            take
        })
    }
}
