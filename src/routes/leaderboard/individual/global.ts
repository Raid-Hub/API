import { RaidHubRoute } from "@/core/RaidHubRoute"
import { cacheControl } from "@/middleware/cache-control"
import { zLeaderboardData } from "@/schema/components/LeaderboardData"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zIndividualGlobalLeaderboardCategory } from "@/schema/params/IndividualGlobalLeaderboardCategory"
import { zLeaderboardPagination } from "@/schema/query/LeaderboardPagination"
import { zBigIntString } from "@/schema/util"
import {
    getIndividualGlobalLeaderboard,
    searchIndividualGlobalLeaderboard
} from "@/services/leaderboard/individual/global"
import { z } from "zod"

export const leaderboardIndividualGlobalRoute = new RaidHubRoute({
    method: "get",
    description: `Individual leaderboards across all raids`,
    params: z.object({
        category: zIndividualGlobalLeaderboardCategory
    }),
    query: zLeaderboardPagination,
    response: {
        errors: [
            {
                statusCode: 404,
                code: ErrorCode.PlayerNotOnLeaderboardError,
                schema: z.object({
                    membershipId: zBigIntString()
                })
            }
        ],
        success: {
            statusCode: 200,
            schema: zLeaderboardData
        }
    },
    middleware: [cacheControl(15)],
    async handler(req) {
        const { category } = req.params

        const { page, count, search } = req.query

        if (search) {
            const data = await searchIndividualGlobalLeaderboard({
                membershipId: search,
                take: count,
                category
            })

            if (!data) {
                return RaidHubRoute.fail(ErrorCode.PlayerNotOnLeaderboardError, {
                    membershipId: search
                })
            }

            return RaidHubRoute.ok({
                type: "individual" as const,
                format: category === "speedrun" ? ("duration" as const) : ("numerical" as const),
                page: data.page,
                count,
                entries: data.entries
            })
        } else {
            const entries = await getIndividualGlobalLeaderboard({
                skip: (page - 1) * count,
                take: count,
                category
            })

            return RaidHubRoute.ok({
                type: "individual" as const,
                format: ["speedrun", "in-raid-time"].includes(category)
                    ? ("duration" as const)
                    : ("numerical" as const),
                page,
                count,
                entries
            })
        }
    }
})
