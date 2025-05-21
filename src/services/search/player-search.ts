import { postgres } from "@/integrations/postgres"
import { playerSearchQueryTimer } from "@/integrations/prometheus/metrics"
import { withHistogramTimer } from "@/integrations/prometheus/util"
import { PlayerInfo } from "@/schema/components/PlayerInfo"
import { DestinyMembershipType } from "@/schema/enums/DestinyMembershipType"

/**
 * Case insensitive search
 */
export async function searchForPlayer(
    query: string,
    opts: {
        count: number
        membershipType?: Exclude<DestinyMembershipType, -1>
        global: boolean
    }
): Promise<{
    searchTerm: string
    results: PlayerInfo[]
}> {
    const searchTerm = query.trim().toLowerCase()

    const results = await withHistogramTimer(
        playerSearchQueryTimer,
        { prefixLength: searchTerm.split("#")[0]?.length ?? 0 },
        () =>
            postgres.queryRows<PlayerInfo>(
                `SELECT 
                    membership_id::text AS "membershipId",
                    membership_type AS "membershipType",
                    icon_path AS "iconPath",
                    display_name AS "displayName",
                    bungie_global_display_name AS "bungieGlobalDisplayName",
                    bungie_global_display_name_code AS "bungieGlobalDisplayNameCode",
                    last_seen AS "lastSeen",
                    is_private AS "isPrivate"
                FROM player 
                WHERE lower(${opts.global ? "bungie_name" : "display_name"}) LIKE $1 
                    ${opts.membershipType ? "AND membership_type = $3" : ""}
                    AND last_seen > TIMESTAMP 'epoch'
                ORDER BY _search_score DESC 
                LIMIT $2;`,
                {
                    params: opts.membershipType
                        ? [searchTerm + "%", opts.count, opts.membershipType]
                        : [searchTerm + "%", opts.count],
                    fetchCount: opts.count
                }
            )
    )

    return {
        searchTerm,
        results
    }
}
