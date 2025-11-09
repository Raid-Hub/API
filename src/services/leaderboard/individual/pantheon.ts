import { pgReader } from "@/integrations/postgres"
import { convertStringToBigInt } from "@/integrations/postgres/parsers"
import { IndividualLeaderboardEntry } from "@/schema/components/LeaderboardData"

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

    return await pgReader.queryRows<IndividualLeaderboardEntry>(
        `SELECT
            individual_pantheon_version_leaderboard.${column}_position::int AS "position",
            individual_pantheon_version_leaderboard.${column}_rank::int AS "rank",
            individual_pantheon_version_leaderboard.${column}::int AS "value",
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
        FROM individual_pantheon_version_leaderboard
        JOIN player USING (membership_id)
        WHERE ${column}_position > $1 AND ${column}_position <= ($1 + $2)
            AND version_id = $3
        ORDER BY ${column}_position ASC`,
        {
            params: [skip, take, versionId],
            transformers: {
                playerInfo: { membershipId: convertStringToBigInt }
            }
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

    const result = await pgReader.queryRow<{ position: number }>(
        `SELECT individual_pantheon_version_leaderboard.${column}_position::int AS "position"
        FROM individual_pantheon_version_leaderboard
        WHERE membership_id = $1::bigint AND version_id = $2
        ORDER BY position ASC
        LIMIT 1`,
        { params: [membershipId, versionId] }
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
