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
        conditions.push(`av.activity_id = $${params.length}`)
    }
    if (versionId !== undefined) {
        params.push(versionId)
        conditions.push(`av.version_id = $${params.length}`)
    }
    if (completed !== undefined) {
        params.push(completed)
        conditions.push(`instance.completed = $${params.length}`)
    }
    if (fresh !== undefined) {
        params.push(fresh)
        conditions.push(`instance.fresh = $${params.length}`)
    }
    if (flawless !== undefined) {
        params.push(flawless)
        conditions.push(`instance.flawless = $${params.length}`)
    }
    if (playerCount !== undefined) {
        params.push(playerCount)
        conditions.push(`instance.player_count = $${params.length}`)
    }
    if (minPlayerCount !== undefined) {
        params.push(minPlayerCount)
        conditions.push(`instance.player_count >= $${params.length}`)
    }
    if (maxPlayerCount !== undefined) {
        params.push(maxPlayerCount)
        conditions.push(`instance.player_count <= $${params.length}`)
    }
    if (minDurationSeconds !== undefined) {
        params.push(minDurationSeconds)
        conditions.push(`instance.duration >= $${params.length}`)
    }
    if (maxDurationSeconds !== undefined) {
        params.push(maxDurationSeconds)
        conditions.push(`instance.duration <= $${params.length}`)
    }
    if (season !== undefined) {
        params.push(season)
        conditions.push(`instance.season_id = $${params.length}`)
    }
    if (minSeason !== undefined) {
        params.push(minSeason)
        conditions.push(`instance.season_id >= $${params.length}`)
    }
    if (maxSeason !== undefined) {
        params.push(maxSeason)
        conditions.push(`instance.season_id <= $${params.length}`)
    }
    if (minDate !== undefined) {
        params.push(minDate)
        conditions.push(`instance.date_started >= $${params.length}::timestamp`)
    }
    if (maxDate !== undefined) {
        params.push(maxDate)
        conditions.push(`instance.date_completed <= $${params.length}::timestamp`)
    }
    conditions.push(`instance.player_count <= 25`)

    params.push(count)

    return await pgReader.queryRows<InstanceWithPlayers>(
        `WITH _player_instances AS (${playerStmnts.join(" INTERSECT ")}) 
        SELECT
            instance.instance_id AS "instanceId",
            instance.hash AS "hash",
            av.activity_id::int AS "activityId",
            av.version_id::int AS "versionId",
            instance.completed AS "completed",
            instance.player_count::int AS "playerCount",
            instance.score::int AS "score",
            instance.fresh AS "fresh",
            instance.flawless AS "flawless",
            instance.skull_hashes AS "skullHashes",
            instance.date_started AS "dateStarted",
            instance.date_completed AS "dateCompleted",
            instance.season_id::int AS "season",
            instance.duration::int AS "duration",
            instance.platform_type AS "platformType",
            instance.date_completed < COALESCE(activity_definition.day_one_end, TIMESTAMP 'epoch') AS "isDayOne",
            (
                CASE
                    WHEN pi2_cact.activity_id IS NOT NULL THEN (
                        av.version_id = 32
                        AND instance.date_completed < COALESCE(activity_definition.contest_end, TIMESTAMP 'epoch')
                    )
                    ELSE instance.date_completed < COALESCE(activity_definition.contest_end, TIMESTAMP 'epoch')
                END
            ) AS "isContest",
            instance.date_completed < COALESCE(activity_definition.week_one_end, TIMESTAMP 'epoch') AS "isWeekOne",
            (b.instance_id IS NOT NULL AND NOT COALESCE(instance.is_whitelisted, false)) AS "isBlacklisted",
            "_lateral".players AS "players"
        FROM _player_instances
        INNER JOIN instance USING (instance_id)
        INNER JOIN activity_version av USING (hash)
        INNER JOIN activity_definition ON activity_definition.id = av.activity_id
        LEFT JOIN (
            SELECT DISTINCT avc.activity_id
            FROM activity_version avc
            WHERE avc.version_id = 32
        ) pi2_cact ON pi2_cact.activity_id = activity_definition.id
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
        ORDER BY instance.date_completed DESC
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
