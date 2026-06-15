import { pgReader } from "@/integrations/postgres"
import { convertStringToBigInt, convertStringToDate } from "@/integrations/postgres/transformer"
import { TeamLeaderboardEntry } from "@/schema/components/LeaderboardData"

/** Insurrection Prime Revolutionary (version 134) — final pantheon community raid race. */
export const PANTHEON_COMMUNITY_RACE_VERSION_ID = 134

export const getPantheonCustomRaceTeamLeaderboard = async ({
    skip,
    take
}: {
    skip: number
    take: number
}) => {
    return await pgReader.queryRows<TeamLeaderboardEntry>(
        `SELECT
            position::int,
            rank::int,
            value,
            instance_id as "instanceId",
            "lateral".players
        FROM team_pantheon_custom_race_leaderboard
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
                        'isPrivate', is_private,
                        'cheatLevel', cheat_level
                    )
                    ORDER BY instance_player.kills DESC
                ) as "players"
            FROM instance_player
            INNER JOIN player USING (membership_id)
            WHERE instance_player.instance_id = team_pantheon_custom_race_leaderboard.instance_id
                AND instance_player.completed
        ) as "lateral" ON true
        WHERE position > $1 AND position <= ($1 + $2)
        ORDER BY position ASC`,
        {
            params: [skip, take],
            transformers: {
                players: {
                    membershipId: convertStringToBigInt,
                    lastSeen: convertStringToDate
                }
            }
        }
    )
}

export const searchPantheonCustomRaceTeamLeaderboard = async ({
    membershipId,
    take
}: {
    membershipId: bigint | string
    take: number
}) => {
    const result = await pgReader.queryRow<{ position: number }>(
        `SELECT position::int
        FROM team_pantheon_custom_race_leaderboard
        WHERE membership_ids @> $1::jsonb
        ORDER BY position ASC
        LIMIT 1`,
        { params: [`${[membershipId]}`] }
    )
    if (!result) return null

    const page = Math.ceil(result.position / take)
    return {
        page,
        entries: await getPantheonCustomRaceTeamLeaderboard({
            skip: (page - 1) * take,
            take
        })
    }
}
