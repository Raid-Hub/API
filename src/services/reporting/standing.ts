import { pgReader } from "@/integrations/postgres"
import { convertStringToBigInt, convertStringToDate } from "@/integrations/postgres/transformer"
import {
    InstanceBlacklist,
    InstanceFlag,
    InstancePlayerStanding
} from "@/schema/components/InstanceStanding"

export const getInstanceFlags = async (instanceId: bigint | string) => {
    return await pgReader.queryRows<InstanceFlag>(
        `SELECT 
            fi.cheat_check_version AS "cheatCheckVersion",
            fi.cheat_check_bitmask::text AS "cheatCheckBitmask",
            fi.flagged_at AS "flaggedAt",
            fi.cheat_probability::double precision AS "cheatProbability"
        FROM flag_instance fi
        WHERE fi.instance_id = $1::bigint
        ORDER BY fi.cheat_probability, fi.flagged_at DESC
        LIMIT 10`,
        {
            params: [instanceId],
            transformers: {
                cheatCheckBitmask: convertStringToBigInt
            }
        }
    )
}

export const getInstanceBlacklist = async (instanceId: bigint | string) => {
    return await pgReader.queryRow<InstanceBlacklist>(
        `SELECT 
            bi.instance_id AS "instanceId",
            bi.report_source::text AS "reportSource",
            bi.report_id AS "reportId",
            bi.cheat_check_version AS "cheatCheckVersion",
            bi.reason AS "reason",
            bi.created_at AS "createdAt"
        FROM blacklist_instance bi
        WHERE bi.instance_id = $1::bigint
        LIMIT 1`,
        { params: [instanceId] }
    )
}

export const getInstancePlayersStanding = async (instanceId: bigint | string) => {
    return await pgReader.queryRows<InstancePlayerStanding>(
        `SELECT 
            json_build_object(
                'membershipId', p.membership_id::text,
                'membershipType', p.membership_type,
                'iconPath', p.icon_path,
                'displayName', p.display_name,
                'bungieGlobalDisplayName', p.bungie_global_display_name,
                'bungieGlobalDisplayNameCode', p.bungie_global_display_name_code,
                'lastSeen', p.last_seen,
                'isPrivate', p.is_private,
                'cheatLevel', p.cheat_level
            ) AS "playerInfo",
            p.clears::int,
            ip.completed,
            ip.time_played_seconds::int AS "timePlayedSeconds",
            (
                SELECT COALESCE(jsonb_agg(f.data), '[]'::jsonb)
                FROM (
                    SELECT jsonb_build_object(
                        'instanceId', fip.instance_id::text,
                        'membershipId', fip.membership_id::text,
                        'cheatCheckVersion', fip.cheat_check_version,
                        'cheatCheckBitmask', fip.cheat_check_bitmask::text,
                        'cheatProbability', fip.cheat_probability::double precision,
                        'flaggedAt', fip.flagged_at
                    ) AS "data"
                    FROM flag_instance_player fip
                    WHERE fip.instance_id = $1::bigint
                        AND fip.membership_id = p.membership_id
                    ORDER BY date_trunc('week', fip.flagged_at) DESC, fip.cheat_probability DESC
                    LIMIT 12
                ) AS f
            ) AS "flags",
            (
                SELECT COALESCE(jsonb_agg(f.data), '[]'::jsonb)
                FROM (
                    SELECT jsonb_build_object(
                        'instanceId', fip.instance_id::text,
                        'membershipId', fip.membership_id::text,
                        'instanceDate', i.date_started,
                        'cheatCheckVersion', fip.cheat_check_version,
                        'cheatCheckBitmask', fip.cheat_check_bitmask::text,
                        'cheatProbability', fip.cheat_probability::double precision,
                        'flaggedAt', fip.flagged_at
                    ) AS "data"
                    FROM flag_instance_player fip
                    JOIN instance i USING (instance_id)
                    WHERE fip.membership_id = p.membership_id 
                        AND fip.instance_id <> $1::bigint
                    ORDER BY (fip.cheat_probability - EXTRACT(EPOCH FROM (NOW() - i.date_started)) / 86400 / 365) DESC
                    LIMIT 15
                ) AS f
            ) AS "otherRecentFlags",
            (
                SELECT COALESCE(jsonb_agg(b.data), '[]'::jsonb)
                FROM (
                    SELECT json_build_object(
                        'instanceId', bi.instance_id::text,
                        'individualReason', bip.reason,
                        'reason', bi.reason,
                        'createdAt', bi.created_at,
                        'instanceDate', i.date_started
                    ) AS "data"
                    FROM blacklist_instance bi 
                    JOIN instance i ON i.instance_id = bi.instance_id
                    JOIN instance_player ip ON ip.instance_id = bi.instance_id AND ip.membership_id = p.membership_id
                    LEFT JOIN blacklist_instance_player bip ON bi.instance_id = bip.instance_id 
                        AND bip.membership_id = p.membership_id
                    WHERE bi.instance_id <> $1::bigint
                        AND NOT (bi.report_source = 'BlacklistedPlayerCascade' AND bip.membership_id IS NOT NULL)
                    ORDER BY i.date_started DESC
                    LIMIT 15
                ) AS b
            ) AS "blacklistedInstances"
        FROM instance_player ip
        JOIN player p USING (membership_id)
        WHERE ip.instance_id = $1::bigint
        ORDER BY ip.completed DESC, ip.time_played_seconds DESC
        LIMIT 12`,
        {
            params: [instanceId],
            transformers: {
                playerInfo: { membershipId: convertStringToBigInt, lastSeen: convertStringToDate },
                flags: {
                    membershipId: convertStringToBigInt,
                    instanceId: convertStringToBigInt,
                    cheatCheckBitmask: convertStringToBigInt,
                    flaggedAt: convertStringToDate
                },
                blacklistedInstances: {
                    instanceId: convertStringToBigInt,
                    createdAt: convertStringToDate,
                    instanceDate: convertStringToDate
                },
                otherRecentFlags: {
                    instanceId: convertStringToBigInt,
                    membershipId: convertStringToBigInt,
                    cheatCheckBitmask: convertStringToBigInt,
                    flaggedAt: convertStringToDate
                }
            }
        }
    )
}
