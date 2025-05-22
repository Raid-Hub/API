import { postgres } from "@/integrations/postgres"
import {
    InstanceBlacklist,
    InstanceFlag,
    InstancePlayerFlag,
    InstancePlayerStanding
} from "@/schema/components/InstanceStanding"

export const getInstanceFlags = async (instanceId: bigint | string) => {
    return await postgres.queryRows<InstanceFlag>(
        `SELECT 
            fi.cheat_check_version AS "cheatCheckVersion",
            fi.cheat_check_bitmask::text AS "cheatCheckBitmask",
            fi.flagged_at AS "flaggedAt",
            fi.cheat_probability AS "cheatProbability"
        FROM flag_instance fi
        WHERE fi.instance_id = $1::bigint AND NOT fi.false_positive
        ORDER BY fi.cheat_probability, fi.flagged_at DESC
        LIMIT 10`,
        {
            params: [instanceId],
            fetchCount: 10
        }
    )
}

export const getInstancePlayerFlags = async (instanceId: bigint | string) => {
    return await postgres.queryRows<InstancePlayerFlag>(``, {
        params: [instanceId],
        fetchCount: 12
    })
}

export const getInstanceBlacklist = async (instanceId: bigint | string) => {
    return await postgres.queryRow<InstanceBlacklist>(
        `SELECT 
            bi.instance_id::text AS "instanceId",
            bi.report_source::text AS "reportSource",
            bi.report_id AS "reportId",
            bi.cheat_check_version AS "cheatCheckVersion",
            bi.reason AS "reason",
            bi.created_at AS "createdAt"
        FROM blacklist_instance bi
        WHERE bi.instance_id = $1::bigint
        LIMIT 1`,
        {
            params: [instanceId]
        }
    )
}

// getInstancePlayerFlags(instanceId),
export const getInstancePlayersStanding = async (instanceId: bigint | string) => {
    return await postgres.queryRows<InstancePlayerStanding>(
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
            p.clears,
            ip.completed,
            ip.time_played_seconds AS "timePlayedSeconds",
            (
                SELECT COALESCE(jsonb_agg(f.data), '[]'::jsonb)
                FROM (
                    SELECT jsonb_build_object(
                        'instanceId', fip.instance_id::text,
                        'membershipId', fip.membership_id::text,
                        'cheatCheckVersion', fip.cheat_check_version,
                        'cheatCheckBitmask', fip.cheat_check_bitmask::text,
                        'cheatProbability', fip.cheat_probability,
                        'flaggedAt', fip.flagged_at
                    ) AS "data"
                    FROM flag_instance_player fip
                    WHERE fip.instance_id = $1::bigint AND NOT fip.false_positive
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
                        'cheatProbability', fip.cheat_probability,
                        'flaggedAt', fip.flagged_at
                    ) AS "data"
                    FROM flag_instance_player fip
                    JOIN instance i ON i.instance_id = fip.instance_id
                    WHERE fip.membership_id = p.membership_id 
                        AND fip.instance_id <> $1::bigint
                        AND NOT fip.false_positive
                    ORDER BY date_trunc('week', fip.flagged_at) DESC, fip.cheat_probability DESC
                    LIMIT 10
                ) AS f
            ) AS "otherRecentFlags",
            (
                SELECT COALESCE(jsonb_agg(b.data), '[]'::jsonb)
                FROM (
                    SELECT json_build_object(
                        'instanceId', bip.instance_id,
                        'individualReason', bip.reason,
                        'reason', bi.reason,
                        'createdAt', bi.created_at
                    ) AS "data"
                    FROM blacklist_instance_player bip
                    JOIN instance i ON i.instance_id = bip.instance_id
                    JOIN blacklist_instance bi ON bi.instance_id = bip.instance_id
                    WHERE bip.membership_id = p.membership_id
                        AND bip.instance_id <> $1::bigint
                        AND i.date_started < NOW() - INTERVAL '6 months'
                    ORDER BY bip.instance_id DESC
                    LIMIT 10
                ) AS b
            ) AS "blacklistedInstances"
        FROM instance_player ip
        JOIN player p USING (membership_id)
        WHERE ip.instance_id = $1::bigint
        ORDER BY ip.completed DESC, ip.time_played_seconds DESC
        LIMIT 12`,
        {
            params: [instanceId],
            fetchCount: 12
        }
    )
}
