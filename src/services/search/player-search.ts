import { pgReader } from "@/integrations/postgres"
import { playerSearchQueryTimer } from "@/integrations/prometheus/metrics"
import { withHistogramTimer } from "@/integrations/prometheus/util"
import { PlayerInfo } from "@/schema/components/PlayerInfo"
import { DestinyMembershipType } from "@/schema/enums/DestinyMembershipType"
import { getPlayer } from "@/services/player"

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
    const trimmedQuery = query.trim()
    const searchTerm = trimmedQuery.toLowerCase()
    const isMembershipIdQuery = /^\d+$/.test(trimmedQuery)

    const [nameResults, membershipIdResult] = await Promise.all([
        withHistogramTimer(
            playerSearchQueryTimer,
            { prefixLength: searchTerm.split("#")[0]?.length ?? 0 },
            () =>
                pgReader.queryRows<PlayerInfo>(
                    `SELECT 
                    membership_id AS "membershipId",
                    membership_type AS "membershipType",
                    icon_path AS "iconPath",
                    display_name AS "displayName",
                    bungie_global_display_name AS "bungieGlobalDisplayName",
                    bungie_global_display_name_code AS "bungieGlobalDisplayNameCode",
                    last_seen AS "lastSeen",
                    is_private AS "isPrivate",
                    cheat_level AS "cheatLevel"
                FROM player 
                WHERE lower(${opts.global ? "bungie_name" : "display_name"}) LIKE $1 
                    ${opts.membershipType ? "AND membership_type = $3" : ""}
                    AND last_seen > TIMESTAMP 'epoch'
                ORDER BY _search_score DESC
                LIMIT $2;`,
                    {
                        params: opts.membershipType
                            ? [searchTerm + "%", opts.count, opts.membershipType]
                            : [searchTerm + "%", opts.count]
                    }
                )
        ),
        isMembershipIdQuery ? getPlayer(trimmedQuery).catch(() => null) : Promise.resolve(null)
    ])

    let results = nameResults
    if (membershipIdResult) {
        const membershipIdBigInt = BigInt(trimmedQuery)
        if (!results.some(r => r.membershipId === membershipIdBigInt)) {
            results = [membershipIdResult, ...results]
        }
    }

    return {
        searchTerm,
        results
    }
}
