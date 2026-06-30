import { pgReader } from "@/integrations/postgres"
import { convertStringToBigInt, convertStringToDate } from "@/integrations/postgres/transformer"
import { TeamLeaderboardEntry } from "@/schema/components/LeaderboardData"

/** Insurrection Prime Revolutionary (version 134) — final pantheon community raid race. */
export const PANTHEON_COMMUNITY_RACE_VERSION_ID = 134

const PANTHEON_RACE_SNAPSHOT = "pantheon_custom_race_snapshot"
const PANTHEON_RACE_LEGACY_MV = "team_pantheon_custom_race_leaderboard"

const isMissingRelation = (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "42P01"

const pantheonRacePlayerLateral = (source: string) => `
        LEFT JOIN LATERAL (
            SELECT 
                COALESCE(
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
                    ),
                    '[]'::jsonb
                ) as "players"
            FROM instance_player
            INNER JOIN player USING (membership_id)
            WHERE instance_player.instance_id = ${source}.instance_id
                AND instance_player.completed
        ) as "lateral" ON true`

const withPantheonRaceSource = async <T>(run: (source: string) => Promise<T>): Promise<T> => {
    try {
        return await run(PANTHEON_RACE_SNAPSHOT)
    } catch (error) {
        if (isMissingRelation(error)) {
            return await run(PANTHEON_RACE_LEGACY_MV)
        }
        throw error
    }
}

export const getPantheonCustomRaceTeamLeaderboard = async ({
    skip,
    take
}: {
    skip: number
    take: number
}) => {
    return await withPantheonRaceSource(source =>
        pgReader.queryRows<TeamLeaderboardEntry>(
            `SELECT
            position::int,
            rank::int,
            value,
            instance_id as "instanceId",
            "lateral".players
        FROM ${source}
        ${pantheonRacePlayerLateral(source)}
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
    )
}

export const searchPantheonCustomRaceTeamLeaderboard = async ({
    membershipId,
    take
}: {
    membershipId: bigint | string
    take: number
}) => {
    const result = await withPantheonRaceSource(async source => {
        if (source === PANTHEON_RACE_SNAPSHOT) {
            return await pgReader.queryRow<{ position: number }>(
                `SELECT s.position::int
                FROM pantheon_custom_race_snapshot s
                WHERE EXISTS (
                    SELECT 1
                    FROM instance_player ip
                    WHERE ip.instance_id = s.instance_id
                        AND ip.membership_id = $1::bigint
                        AND ip.completed
                )
                ORDER BY s.position ASC
                LIMIT 1`,
                { params: [membershipId] }
            )
        }

        return await pgReader.queryRow<{ position: number }>(
            `SELECT position::int
            FROM team_pantheon_custom_race_leaderboard
            WHERE membership_ids @> $1::jsonb
            ORDER BY position ASC
            LIMIT 1`,
            { params: [`${[membershipId]}`] }
        )
    })

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
