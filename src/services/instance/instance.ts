import { pgReader } from "@/integrations/postgres"
import {
    convertStringToBigInt,
    convertStringToDate,
    convertUInt32Value
} from "@/integrations/postgres/transformer"
import { Instance, InstanceBasic } from "@/schema/components/Instance"
import { InstanceExtended } from "@/schema/components/InstanceExtended"
import { InstanceMetadata } from "@/schema/components/InstanceMetadata"
import { InstancePlayerExtended } from "@/schema/components/InstancePlayerExtended"
import { PlayerInfo } from "@/schema/components/PlayerInfo"

export async function getInstance(instanceId: bigint | string): Promise<Instance | null> {
    return await pgReader.queryRow<Instance>(
        `SELECT
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
            (b.instance_id IS NOT NULL AND NOT COALESCE(instance.is_whitelisted, false)) AS "isBlacklisted"
        FROM instance
        INNER JOIN activity_version av USING (hash)
        INNER JOIN activity_definition ON activity_definition.id = av.activity_id
        LEFT JOIN blacklist_instance b USING (instance_id)
        WHERE instance_id = $1::bigint
        LIMIT 1;`,
        {
            params: [instanceId],
            transformers: {
                hash: convertUInt32Value,
                skullHashes: convertUInt32Value
            }
        }
    )
}

export async function getInstanceExtended(
    instanceId: bigint | string
): Promise<InstanceExtended | null> {
    const instanceQuery = getInstance(instanceId)
    const leaderboardEntryPromise = getLeaderboardEntryForInstance(instanceId)
    const instancePlayersPromise = pgReader.queryRows<InstancePlayerExtended>(
        `
        SELECT 
            completed as "completed",
            is_first_clear as "isFirstClear",
            ap.sherpas::int as "sherpas",
            time_played_seconds::int as "timePlayedSeconds",
            JSONB_BUILD_OBJECT(
                'membershipId', "membership_id"::text, 
                'membershipType', "membership_type", 
                'iconPath', "icon_path", 
                'displayName', "display_name", 
                'bungieGlobalDisplayName', "bungie_global_display_name", 
                'bungieGlobalDisplayNameCode', "bungie_global_display_name_code", 
                'lastSeen', "last_seen",
                'isPrivate', "is_private",
                'cheatLevel', "cheat_level"
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
                    'timePlayedSeconds', "time_played_seconds"::int, 
                    'startSeconds', "start_seconds"::int, 
                    'score', "score"::int, 
                    'kills', "kills"::int, 
                    'assists', "assists"::int, 
                    'deaths', "deaths"::int, 
                    'precisionKills', "precision_kills"::int, 
                    'superKills', "super_kills"::int, 
                    'grenadeKills', "grenade_kills"::int, 
                    'meleeKills', "melee_kills"::int, 
                    'weapons', "weapons_json"
                )
            ) AS "characters_json"
            FROM (
                SELECT "ac".*, "t2".* FROM "instance_character" "ac"
                LEFT JOIN LATERAL (
                    SELECT COALESCE(
                        JSONB_AGG(
                            JSONB_BUILD_OBJECT(
                                'weaponHash', w."weapon_hash", 
                                'kills', w."kills"::int, 
                                'precisionKills', w."precision_kills"::int
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
                WHERE "ap"."membership_id" = "ac"."membership_id"
                    AND "ap"."instance_id" = "ac"."instance_id"
                ORDER BY "completed" DESC, "time_played_seconds" DESC
            ) AS "c"
                ) AS "t1" ON true
        WHERE instance_id = $1::bigint
        ORDER BY completed DESC, time_played_seconds DESC;`,
        {
            params: [instanceId],
            transformers: {
                playerInfo: {
                    membershipId: convertStringToBigInt,
                    lastSeen: convertStringToDate
                },
                characters: { characterId: convertStringToBigInt }
            }
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

export async function getInstanceMetadataByHash(
    hash: number | string | bigint
): Promise<InstanceMetadata> {
    const metaData = await pgReader.queryRow<InstanceMetadata>(
        `SELECT
            ad.name AS "activityName",
            vd.name AS "versionName",
            ad.is_raid AS "isRaid"
        FROM activity_version ah
        INNER JOIN activity_definition ad ON ad.id = ah.activity_id
        INNER JOIN version_definition vd ON vd.id = ah.version_id
        WHERE hash = $1::bigint
        LIMIT 1;`,
        { params: [hash.toString()] }
    )
    if (!metaData) {
        throw new Error("Metadata not found")
    }
    return metaData
}

export const getLeaderboardEntryForInstance = async (instanceId: bigint | string) => {
    return await pgReader.queryRow<{
        rank: number
    }>(
        `SELECT rank::int
        FROM team_activity_version_leaderboard
        WHERE instance_id = $1::bigint
        ORDER BY rank ASC
        LIMIT 1;`,
        { params: [instanceId] }
    )
}

export async function getInstanceBasic(instanceId: bigint | string) {
    const instance = await pgReader.queryRow<InstanceBasic>(
        `SELECT
            instance_id AS "instanceId",
            hash AS "hash",
            completed AS "completed",
            player_count::int AS "playerCount",
            score::int AS "score",
            fresh AS "fresh",
            flawless AS "flawless",
            skull_hashes AS "skullHashes",
            date_started AT TIME ZONE 'UTC' AS "dateStarted",
            date_completed AT TIME ZONE 'UTC' AS "dateCompleted",
            season_id::int AS "season",
            duration::int AS "duration",
            platform_type AS "platformType",
            pgcr.date_crawled AS "dateResolved"
        FROM instance
        JOIN pgcr USING (instance_id)
        WHERE instance_id = $1::bigint
        LIMIT 1;`,
        {
            params: [instanceId],
            transformers: {
                hash: convertUInt32Value,
                skullHashes: convertUInt32Value
            }
        }
    )

    return instance
}

export async function getInstancePlayerInfo(instanceId: bigint | string) {
    return await pgReader.queryRows<PlayerInfo>(
        `SELECT 
            player.membership_id AS "membershipId",
            player.membership_type AS "membershipType",
            player.icon_path AS "iconPath",
            player.display_name AS "displayName",
            player.bungie_global_display_name AS "bungieGlobalDisplayName",
            player.bungie_global_display_name_code AS "bungieGlobalDisplayNameCode",
            player.last_seen AS "lastSeen",
            player.is_private AS "isPrivate",
            player.cheat_level AS "cheatLevel"
        FROM "instance_player" "ap"
        INNER JOIN "player" USING (membership_id)
        WHERE instance_id = $1::bigint
        ORDER BY completed DESC, time_played_seconds DESC;`,
        { params: [instanceId] }
    )
}
