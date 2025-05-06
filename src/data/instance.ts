import { Instance } from "../schema/components/Instance"
import { InstanceExtended } from "../schema/components/InstanceExtended"
import { InstanceMetadata } from "../schema/components/InstanceMetadata"
import { InstancePlayerExtended } from "../schema/components/InstancePlayerExtended"
import { postgres } from "../services/postgres"

export async function getInstance(instanceId: bigint | string): Promise<Instance | null> {
    return await postgres.queryRow<Instance>(
        `SELECT 
            instance_id::text AS "instanceId",
            hash AS "hash",
            activity_id AS "activityId",
            version_id AS "versionId",
            completed AS "completed",
            player_count AS "playerCount",
            score AS "score",
            fresh AS "fresh",
            flawless AS "flawless",
            date_started AS "dateStarted",
            date_completed AS "dateCompleted",
            season_id AS "season",
            duration AS "duration",
            platform_type AS "platformType",
            date_completed < COALESCE(day_one_end, TIMESTAMP 'epoch') AS "isDayOne",
            date_completed < COALESCE(contest_end, TIMESTAMP 'epoch') AS "isContest",
            date_completed < COALESCE(week_one_end, TIMESTAMP 'epoch') AS "isWeekOne"
        FROM instance
        INNER JOIN activity_version USING (hash)
        INNER JOIN activity_definition ON activity_definition.id = activity_version.activity_id
        WHERE instance_id = $1::bigint
        LIMIT 1;`,
        {
            params: [instanceId]
        }
    )
}

export async function getInstanceExtended(
    instanceId: bigint | string
): Promise<InstanceExtended | null> {
    const instanceQuery = getInstance(instanceId)
    const leaderboardEntryPromise = getLeaderboardEntryForInstance(instanceId)
    const instancePlayersPromise = postgres.queryRows<InstancePlayerExtended>(
        `
        SELECT 
            completed as "completed",
            is_first_clear as "isFirstClear",
            ap.sherpas as "sherpas",
            time_played_seconds as "timePlayedSeconds",
            JSONB_BUILD_OBJECT(
                'membershipId', "membership_id"::text, 
                'membershipType', "membership_type", 
                'iconPath', "icon_path", 
                'displayName', "display_name", 
                'bungieGlobalDisplayName', "bungie_global_display_name", 
                'bungieGlobalDisplayNameCode', "bungie_global_display_name_code", 
                'lastSeen', "last_seen",
                'isPrivate', "is_private"
            ) AS "playerInfo", 
            "t1"."characters_json" AS "characters"
        FROM "instance_player" "ap"
        LEFT JOIN "player" USING (membership_id)
        LEFT JOIN LATERAL (
            SELECT JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'characterId', "character_id"::text, 
                    'classHash', "class_hash", 
                    'emblemHash', "emblem_hash", 
                    'completed', "completed", 
                    'timePlayedSeconds', "time_played_seconds", 
                    'startSeconds', "start_seconds", 
                    'score', "score", 
                    'kills', "kills", 
                    'assists', "assists", 
                    'deaths', "deaths", 
                    'precisionKills', "precision_kills", 
                    'superKills', "super_kills", 
                    'grenadeKills', "grenade_kills", 
                    'meleeKills', "melee_kills", 
                    'weapons', "t2"."weapons_json"
                )
            ) AS "characters_json"
            FROM (
                SELECT * FROM "instance_character" "ac"
                WHERE "ap"."membership_id" = "ac"."membership_id"
                    AND "ap"."instance_id" = "ac"."instance_id"
                ORDER BY "completed" DESC, "time_played_seconds" DESC
            ) AS "c"
            LEFT JOIN LATERAL (
                SELECT COALESCE(
                    JSONB_AGG(
                        JSONB_BUILD_OBJECT(
                            'weaponHash', w."weapon_hash", 
                            'kills', w."kills", 
                            'precisionKills', w."precision_kills"
                        )
                    ), '[]'::jsonb
                ) AS "weapons_json"
                FROM (
                    SELECT "weapon_hash", "kills", "precision_kills"
                    FROM "instance_character_weapon"
                    WHERE "character_id" = "ac"."character_id"
                        AND "membership_id" = "ac"."membership_id" 
                        AND "instance_id" = "ac"."instance_id"
                    ORDER BY "kills" DESC
                ) AS w
            ) as "t2" ON true
        ) AS "t1" ON true 
        WHERE instance_id = $1::bigint
        ORDER BY completed DESC, time_played_seconds DESC;`,
        {
            params: [instanceId],
            fetchCount: 100000
        }
    )

    return await instanceQuery.then(async instance => {
        if (!instance) {
            return null
        }
        const instanceMetadataPromise = getInstanceMetadataByHash(instance.hash)

        return {
            ...instance,
            leaderboardRank: await leaderboardEntryPromise.then(entry => entry?.rank || null),
            metadata: await instanceMetadataPromise,
            players: await instancePlayersPromise
        }
    })
}

export async function getInstanceMetadataByHash(hash: number | string): Promise<InstanceMetadata> {
    const metaData = await postgres.queryRow<InstanceMetadata>(
        `SELECT 
            ad.name AS "activityName",
            vd.name AS "versionName",
            ad.is_raid AS "isRaid"
        FROM activity_version ah
        INNER JOIN activity_definition ad ON ad.id = ah.activity_id
        INNER JOIN version_definition vd ON vd.id = ah.version_id
        WHERE hash = $1::bigint
        LIMIT 1;`,
        {
            params: [String(hash)]
        }
    )
    if (!metaData) {
        throw new Error("Metadata not found")
    }
    return metaData
}

export const getLeaderboardEntryForInstance = async (instanceId: bigint | string) => {
    return await postgres.queryRow<{
        rank: number
    }>(
        `SELECT rank
        FROM team_activity_version_leaderboard
        WHERE instance_id = $1::bigint
        ORDER BY rank ASC
        LIMIT 1;`,
        {
            params: [instanceId]
        }
    )
}
