import { pgReader } from "@/integrations/postgres"
import { ClanLeaderboardEntry } from "@/schema/components/Clan"

export const clanLeaderboardSortColumns = [
    "clears",
    "average_clears",
    "fresh_clears",
    "average_fresh_clears",
    "sherpas",
    "average_sherpas",
    "time_played_seconds",
    "average_time_played_seconds",
    "total_contest_score",
    "weighted_contest_score"
] as const

const validateColumn = (column: (typeof clanLeaderboardSortColumns)[number]) => {
    if (!clanLeaderboardSortColumns.includes(column)) {
        // Just an extra layer of run-time validation to ensure that the column is one of the valid columns
        throw new TypeError(`Invalid column: ${column}`)
    }
}

export const getClanLeaderboard = async ({
    skip,
    take,
    column
}: {
    skip: number
    take: number
    column: (typeof clanLeaderboardSortColumns)[number]
}) => {
    validateColumn(column)

    return await pgReader.queryRows<ClanLeaderboardEntry>(
        `SELECT
            JSONB_BUILD_OBJECT(
                'groupId', clan."group_id"::text,
                'name', clan.name,
                'callSign', clan.call_sign,
                'motto', clan."motto",
                'clanBannerData', clan."clan_banner_data",
                'lastUpdated', TO_CHAR(clan."updated_at" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                'knownMemberCount', clan_leaderboard."known_member_count"::int
            ) AS "clan",
            "clears"::int,
            "average_clears"::int AS "averageClears",
            "fresh_clears"::int AS "freshClears",
            "average_fresh_clears"::int AS "averageFreshClears",
            "sherpas"::int,
            "average_sherpas"::int AS "averageSherpas",
            "time_played_seconds"::int AS "timePlayedSeconds",
            "average_time_played_seconds"::int AS "averageTimePlayedSeconds",
            "total_contest_score" AS "totalContestScore",
            "weighted_contest_score" AS "weightedContestScore"
        FROM clan_leaderboard
        INNER JOIN clan USING (group_id)
        ORDER BY ${column} DESC
        OFFSET $1
        LIMIT $2`,
        [skip, take]
    )
}
