import { RaidHubRoute } from "@/RaidHubRoute"
import { clanLeaderboardSortColumns, getClanLeaderboard } from "@/data/leaderboard/clan"
import { cacheControl } from "@/middlewares/cache-control"
import { zClanLeaderboardEntry } from "@/schema/components/Clan"
import { zPage } from "@/schema/util"
import { z } from "zod"

export const clanLeaderboardRoute = new RaidHubRoute({
    method: "get",
    description: "Get a page of the clan leaderboard based on query parameters",
    query: z.object({
        count: z.coerce.number().int().min(10).max(100).default(50),
        page: zPage(),
        column: z.enum(clanLeaderboardSortColumns).default("weighted_contest_score")
    }),
    response: {
        errors: [],
        success: {
            statusCode: 200,
            schema: z.array(zClanLeaderboardEntry)
        }
    },
    middleware: [cacheControl(60)],
    async handler(req) {
        const { page, count, column } = req.query

        const entries = await getClanLeaderboard({
            skip: (page - 1) * count,
            take: count,
            column
        })

        return RaidHubRoute.ok(entries)
    }
})
