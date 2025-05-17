import { IndividualLeaderboardEntry } from "@/schema/components/LeaderboardData"
import { postgres } from "@/services/postgres"

export const individualPantheonLeaderboardSortColumns = ["clears", "fresh_clears", "score"] as const

const validateColumn = (column: (typeof individualPantheonLeaderboardSortColumns)[number]) => {
    if (!individualPantheonLeaderboardSortColumns.includes(column)) {
        // Just an extra layer of run-time validation to ensure that the column is one of the valid columns
        throw new TypeError(`Invalid column: ${column}`)
    }
}

export const getIndividualPantheonLeaderboard = async ({
    versionId,
    skip,
    take,
    column
}: {
    versionId: number
    skip: number
    take: number
    column: (typeof individualPantheonLeaderboardSortColumns)[number]
}) => {
    validateColumn(column)

    return await postgres.queryRows<IndividualLeaderboardEntry>(
        `SELECT
            individual_pantheon_version_leaderboard.${column}_position AS "position",
            individual_pantheon_version_leaderboard.${column}_rank AS "rank",
            individual_pantheon_version_leaderboard.${column} AS "value",
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
        FROM individual_pantheon_version_leaderboard
        JOIN player USING (membership_id)
        WHERE ${column}_position > $1 AND ${column}_position <= ($1 + $2)
            AND version_id = $3
        ORDER BY ${column}_position ASC`,
        {
            params: [skip, take, versionId],
            fetchCount: take
        }
    )
}

export const searchIndividualPantheonLeaderboard = async ({
    membershipId,
    versionId,
    take,
    column
}: {
    membershipId: bigint | string
    versionId: number
    take: number
    column: (typeof individualPantheonLeaderboardSortColumns)[number]
}) => {
    validateColumn(column)

    const result = await postgres.queryRow<{ position: number }>(
        `SELECT individual_pantheon_version_leaderboard.${column}_position AS "position" 
        FROM individual_pantheon_version_leaderboard 
        WHERE membership_id = $1::bigint AND version_id = $2
        ORDER BY position ASC
        LIMIT 1`,
        {
            params: [membershipId, versionId]
        }
    )
    if (!result) return null

    const page = Math.ceil(result.position / take)
    return {
        page,
        entries: await getIndividualPantheonLeaderboard({
            versionId,
            skip: (page - 1) * take,
            take,
            column
        })
    }
}
