import { postgres } from "@/integrations/postgres"
import { IndividualLeaderboardEntry } from "@/schema/components/LeaderboardData"
import { IndividualGlobalLeaderboardCategory } from "@/schema/params/IndividualGlobalLeaderboardCategory"

export const individualGlobalLeaderboardSortColumns = [
    "clears",
    "fresh_clears",
    "sherpas",
    "speed",
    "total_time_played"
] as const

const categoryMap = {
    clears: "clears",
    "full-clears": "fresh_clears",
    sherpas: "sherpas",
    speedrun: "speed",
    "in-raid-time": "total_time_played"
} as const

const getColumn = (category: string) => {
    const column = categoryMap[category as keyof typeof categoryMap]
    if (!individualGlobalLeaderboardSortColumns.includes(column)) {
        // Just an extra layer of run-time validation to ensure that the column is one of the valid columns
        throw new TypeError(`Invalid column: ${column}`)
    }
    return column
}

export const getIndividualGlobalLeaderboard = async ({
    skip,
    take,
    category
}: {
    skip: number
    take: number
    category: Exclude<IndividualGlobalLeaderboardCategory, "world-first-rankings">
}) => {
    const column = getColumn(category)

    return await postgres.queryRows<IndividualLeaderboardEntry>(
        `SELECT
            individual_global_leaderboard.${column}_position AS "position",
            individual_global_leaderboard.${column}_rank AS "rank",
            individual_global_leaderboard.${column} AS "value",
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
            ) as "playerInfo"
        FROM individual_global_leaderboard
        JOIN player USING (membership_id)
        WHERE ${column}_position > $1 AND ${column}_position <= ($1 + $2)
        ORDER BY ${column}_position ASC`,
        {
            params: [skip, take],
            fetchCount: take
        }
    )
}

export const searchIndividualGlobalLeaderboard = async ({
    membershipId,
    take,
    category
}: {
    membershipId: bigint | string
    take: number
    category: Exclude<IndividualGlobalLeaderboardCategory, "world-first-rankings">
}) => {
    const column = getColumn(category)

    const result = await postgres.queryRow<{ position: number }>(
        `SELECT individual_global_leaderboard.${column}_position AS "position" 
        FROM individual_global_leaderboard 
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
        entries: await getIndividualGlobalLeaderboard({
            skip: (page - 1) * take,
            take,
            category
        })
    }
}
