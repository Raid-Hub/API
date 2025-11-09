import { pgReader } from "@/integrations/postgres"
import { convertStringToBigInt } from "@/integrations/postgres/parsers"
import { IndividualLeaderboardEntry } from "@/schema/components/LeaderboardData"
import { IndividualGlobalLeaderboardCategory } from "@/schema/params/IndividualGlobalLeaderboardCategory"

const categoryMap = {
    clears: "clears",
    "full-clears": "fresh_clears",
    sherpas: "sherpas",
    speedrun: "speed",
    "in-raid-time": "total_time_played",
    "world-first-rankings": "wfr_score"
} as const

const getColumn = (category: string) => {
    const column = categoryMap[category as keyof typeof categoryMap]
    if (!column) {
        // Just an extra layer of run-time validation to ensure that the column is one of the valid columns
        throw new TypeError(`Invalid column: ${category}->${column}`)
    }
    return column
}

export const getIndividualGlobalLeaderboardValueFormat = (
    category: IndividualGlobalLeaderboardCategory
): "numerical" | "duration" =>
    ["speedrun", "in-raid-time"].includes(category) ? "duration" : "numerical"

export const getIndividualGlobalLeaderboard = async ({
    skip,
    take,
    category
}: {
    skip: number
    take: number
    category: IndividualGlobalLeaderboardCategory
}) => {
    const column = getColumn(category)

    return await pgReader.queryRows<IndividualLeaderboardEntry>(
        `SELECT
            individual_global_leaderboard.${column}_position::int AS "position",
            individual_global_leaderboard.${column}_rank::int AS "rank",
            individual_global_leaderboard.${column}::${column === "wfr_score" ? "double precision" : "int"} AS "value",
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
            transformers: {
                playerInfo: { membershipId: convertStringToBigInt }
            }
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
    category: IndividualGlobalLeaderboardCategory
}) => {
    const column = getColumn(category)

    const result = await pgReader.queryRow<{ position: number }>(
        `SELECT individual_global_leaderboard.${column}_position::int AS "position"
        FROM individual_global_leaderboard
        WHERE membership_id = $1::bigint
        ORDER BY position ASC
        LIMIT 1`,
        { params: [membershipId] }
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
