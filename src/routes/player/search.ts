import { RaidHubRoute } from "@/core/RaidHubRoute"
import { cacheControl } from "@/middleware/cache-control"
import { zPlayerInfo } from "@/schema/components/PlayerInfo"
import { zDestinyMembershipType } from "@/schema/enums/DestinyMembershipType"
import { zNaturalNumber } from "@/schema/output"
import { searchForPlayer } from "@/services/search/player-search"
import { z } from "zod"

export const playerSearchRoute = new RaidHubRoute({
    method: "get",
    description: `Search for players in the RaidHub database by Bungie name or platform display name. 
Players who have not attempted a raid may not appear in the search results. 
Results are ordered by a combination of the number of raid completions and last played date.`,
    query: z.object({
        count: z.coerce.number().int().min(1).max(50).default(20),
        query: z.string().min(1).max(40),
        membershipType: zDestinyMembershipType.default(-1).openapi({
            description:
                "Filter by Destiny membership type. Defaults to -1 (all). Note that the membership type of an account is determined by the platform the was first created on"
        }),
        global: z.boolean().default(true).openapi({
            description:
                "Search by bungie name. Defaults to true. Set this parameter to false to search by platform display name instead"
        })
    }),
    response: {
        success: {
            statusCode: 200,
            schema: z
                .object({
                    params: z.object({
                        count: zNaturalNumber(),
                        query: z.string()
                    }),
                    results: z.array(zPlayerInfo)
                })
                .strict()
        }
    },
    middleware: [cacheControl(120)],
    async handler(req) {
        const { query, count, membershipType, global } = req.query
        const { searchTerm, results } = await searchForPlayer(query, {
            count,
            membershipType: membershipType === -1 ? undefined : membershipType,
            global
        })

        return RaidHubRoute.ok({
            params: { count, query: searchTerm },
            results
        })
    }
})
