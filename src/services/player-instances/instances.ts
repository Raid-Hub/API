import { pgReader } from "@/integrations/postgres"
import {
    convertStringToBigInt,
    convertStringToDate,
    convertUInt32Value
} from "@/integrations/postgres/transformer"
import { InstanceWithPlayers } from "@/schema/components/InstanceWithPlayers"

export async function getInstances({
    count,
    membershipIds,
    activityId,
    versionId,
    completed,
    fresh,
    flawless,
    playerCount,
    minPlayerCount,
    maxPlayerCount,
    minDurationSeconds,
    maxDurationSeconds,
    season,
    minSeason,
    maxSeason,
    minDate,
    maxDate
}: {
    count: number
    membershipIds: (bigint | string)[]
    activityId?: number
    versionId?: number
    completed?: boolean
    fresh?: boolean
    flawless?: boolean
    playerCount?: number
    minPlayerCount?: number
    maxPlayerCount?: number
    minDurationSeconds?: number
    maxDurationSeconds?: number
    season?: number
    minSeason?: number
    maxSeason?: number
    minDate?: Date
    maxDate?: Date
}): Promise<InstanceWithPlayers[]> {
    const params: (string | number | boolean | Date)[] = []
    const conditions: string[] = []

    if (membershipIds.length === 0) {
        throw new TypeError("No membership IDs provided")
    }

    const playerStmnts = new Array<string>(membershipIds.length)
    for (let i = 0; i < membershipIds.length; i++) {
        params.push(String(membershipIds[i]))
        playerStmnts[i] =
            `SELECT instance_id FROM instance_player WHERE membership_id = $${params.length}::bigint`
    }

    if (activityId !== undefined) {
        params.push(activityId)
        conditions.push(`activity_id = $${params.length}`)
    }
    if (versionId !== undefined) {
        params.push(versionId)
        conditions.push(`version_id = $${params.length}`)
    }
    if (completed !== undefined) {
        params.push(completed)
        conditions.push(`completed = $${params.length}`)
    }
    if (fresh !== undefined) {
        params.push(fresh)
        conditions.push(`fresh = $${params.length}`)
    }
    if (flawless !== undefined) {
        params.push(flawless)
        conditions.push(`flawless = $${params.length}`)
    }
    if (playerCount !== undefined) {
        params.push(playerCount)
        conditions.push(`player_count = $${params.length}`)
    }
    if (minPlayerCount !== undefined) {
        params.push(minPlayerCount)
        conditions.push(`player_count >= $${params.length}`)
    }
    if (maxPlayerCount !== undefined) {
        params.push(maxPlayerCount)
        conditions.push(`player_count <= $${params.length}`)
    }
    if (minDurationSeconds !== undefined) {
        params.push(minDurationSeconds)
        conditions.push(`duration >= $${params.length}`)
    }
    if (maxDurationSeconds !== undefined) {
        params.push(maxDurationSeconds)
        conditions.push(`duration <= $${params.length}`)
    }
    if (season !== undefined) {
        params.push(season)
        conditions.push(`season_id = $${params.length}`)
    }
    if (minSeason !== undefined) {
        params.push(minSeason)
        conditions.push(`season_id >= $${params.length}`)
    }
    if (maxSeason !== undefined) {
        params.push(maxSeason)
        conditions.push(`season_id <= $${params.length}`)
    }
    if (minDate !== undefined) {
        params.push(minDate)
        conditions.push(`date_started >= $${params.length}::timestamp`)
    }
    if (maxDate !== undefined) {
        params.push(maxDate)
        conditions.push(`date_completed <= $${params.length}::timestamp`)
    }
    conditions.push(`instance.player_count <= 25`)

    params.push(count)

    return await pgReader.queryRows<InstanceWithPlayers>(
        `WITH _player_instances AS (${playerStmnts.join(" INTERSECT ")}) 
        SELECT
            instance_id AS "instanceId",
            hash AS "hash",
            activity_id::int AS "activityId",
            version_id::int AS "versionId",
            completed AS "completed",
            player_count::int AS "playerCount",
            score::int AS "score",
            fresh AS "fresh",
            flawless AS "flawless",
            skull_hashes AS "skullHashes",
            date_started AS "dateStarted",
            date_completed AS "dateCompleted",
            season_id::int AS "season",
            duration::int AS "duration",
            platform_type AS "platformType",
            CASE WHEN av.is_contest_eligible THEN date_completed < COALESCE(day_one_end, TIMESTAMP 'epoch') ELSE false END AS "isDayOne",
            CASE WHEN av.is_contest_eligible THEN date_completed < COALESCE(contest_end, TIMESTAMP 'epoch') ELSE false END AS "isContest",
            date_completed < COALESCE(week_one_end, TIMESTAMP 'epoch') AS "isWeekOne",
            b.instance_id IS NOT NULL AS "isBlacklisted",
            "_lateral".players AS "players"
        FROM _player_instances
        INNER JOIN instance USING (instance_id)
        INNER JOIN activity_version av USING (hash)
        INNER JOIN activity_definition ON activity_definition.id = av.activity_id
        LEFT JOIN blacklist_instance b USING (instance_id)
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
                    ORDER BY instance_player.completed DESC, instance_player.time_played_seconds DESC
                ) as "players"
            FROM _player_instances _pi2
            INNER JOIN instance_player USING (instance_id)
            INNER JOIN player USING (membership_id)
            WHERE _player_instances.instance_id = _pi2.instance_id
        ) as "_lateral" ON true
        WHERE ${conditions.join(" AND ")}
        ORDER BY date_completed DESC
        LIMIT $${params.length}
        `,
        {
            params,
            transformers: {
                hash: convertUInt32Value,
                skullHashes: convertUInt32Value,
                players: {
                    membershipId: convertStringToBigInt,
                    lastSeen: convertStringToDate
                }
            }
        }
    )
}
