import { pgReader } from "@/integrations/postgres"
import { IndividualLeaderboardEntry } from "@/schema/components/LeaderboardData"

export const individualRaidLeaderboardSortColumns = ["clears", "fresh_clears", "sherpas"] as const

const validateColumn = (column: (typeof individualRaidLeaderboardSortColumns)[number]) => {
    if (!individualRaidLeaderboardSortColumns.includes(column)) {
        // Just an extra layer of run-time validation to ensure that the column is one of the valid columns
        throw new TypeError(`Invalid column: ${column}`)
    }
}

export const getIndividualRaidLeaderboard = async ({
    raidId,
    skip,
    take,
    column
}: {
    raidId: number
    skip: number
    take: number
    column: (typeof individualRaidLeaderboardSortColumns)[number]
}) => {
    validateColumn(column)

    return await pgReader.queryRows<IndividualLeaderboardEntry>(
        `SELECT
            individual_raid_leaderboard.${column}_position AS "position",
            individual_raid_leaderboard.${column}_rank AS "rank",
            individual_raid_leaderboard.${column} AS "value",
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
        FROM individual_raid_leaderboard
        JOIN player USING (membership_id)
        WHERE ${column}_position > $1 AND ${column}_position <= ($1 + $2)
            AND activity_id = $3
        ORDER BY ${column}_position ASC`,
        [skip, take, raidId]
    )
}

export const searchIndividualRaidLeaderboard = async ({
    membershipId,
    raidId,
    take,
    column
}: {
    membershipId: bigint | string
    raidId: number
    take: number
    column: (typeof individualRaidLeaderboardSortColumns)[number]
}) => {
    validateColumn(column)

    const result = await pgReader.queryRow<{ position: number }>(
        `SELECT individual_raid_leaderboard.${column}_position AS "position" 
        FROM individual_raid_leaderboard 
        WHERE membership_id = $1::bigint AND activity_id = $2
        ORDER BY position ASC
        LIMIT 1`,
        [membershipId, raidId]
    )
    if (!result) return null

    const page = Math.ceil(result.position / take)
    return {
        page,
        entries: await getIndividualRaidLeaderboard({
            raidId,
            skip: (page - 1) * take,
            take,
            column
        })
    }
}
