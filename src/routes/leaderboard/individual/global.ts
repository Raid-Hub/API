import { RaidHubRoute } from "@/core/RaidHubRoute"
import { cacheControl } from "@/middleware/cache-control"
import { zLeaderboardData } from "@/schema/components/LeaderboardData"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zLeaderboardPagination } from "@/schema/query/LeaderboardPagination"
import { zBigIntString } from "@/schema/util"
import {
    getIndividualGlobalLeaderboard,
    searchIndividualGlobalLeaderboard
} from "@/services/leaderboard/individual/global"
import {
    getIndividualWorldFirstPowerRankingsLeaderboard,
    searchIndividualWorldFirstPowerRankingsLeaderboard
} from "@/services/leaderboard/individual/power-rankings"
import { z } from "zod"

const zCategory = z.enum(["clears", "freshClears", "sherpas", "speedrun", "powerRankings"])

const categoryMap = {
    clears: "clears",
    freshClears: "fresh_clears",
    sherpas: "sherpas",
    speedrun: "speed"
} as const

export const leaderboardIndividualGlobalRoute = new RaidHubRoute({
    method: "get",
    description: `Individual leaderboards across all raids`,
    params: z.object({
        category: zCategory
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
            const data = await (category === "powerRankings"
                ? searchIndividualWorldFirstPowerRankingsLeaderboard({
                      membershipId: search,
                      take: count
                  })
                : searchIndividualGlobalLeaderboard({
                      membershipId: search,
                      take: count,
                      column: categoryMap[category]
                  }))

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
            const entries = await (category === "powerRankings"
                ? getIndividualWorldFirstPowerRankingsLeaderboard({
                      skip: (page - 1) * count,
                      take: count
                  })
                : getIndividualGlobalLeaderboard({
                      skip: (page - 1) * count,
                      take: count,
                      column: categoryMap[category]
                  }))

            return RaidHubRoute.ok({
                type: "individual" as const,
                format: category === "speedrun" ? ("duration" as const) : ("numerical" as const),
                page,
                count,
                entries
            })
        }
    }
})
