import { RaidHubRoute } from "@/RaidHubRoute"
import { getRaidId } from "@/data/definitions"
import {
    getIndividualRaidLeaderboard,
    individualRaidLeaderboardSortColumns,
    searchIndividualRaidLeaderboard
} from "@/data/leaderboard/individual/raid"
import { cacheControl } from "@/middlewares/cache-control"
import { zLeaderboardData } from "@/schema/components/LeaderboardData"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zLeaderboardPagination } from "@/schema/query/LeaderboardPagination"
import { zBigIntString } from "@/schema/util"
import { z } from "zod"

const zCategory = z.enum(["clears", "freshClears", "sherpas"])

const categoryMap: Record<
    z.infer<typeof zCategory>,
    (typeof individualRaidLeaderboardSortColumns)[number]
> = {
    clears: "clears",
    freshClears: "fresh_clears",
    sherpas: "sherpas"
}

export const leaderboardIndividualRaidRoute = new RaidHubRoute({
    method: "get",
    description: `Individual leaderboards for a specific raid`,
    params: z.object({
        raid: z.string(),
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
            },
            {
                statusCode: 404,
                code: ErrorCode.RaidNotFoundError,
                schema: z.object({
                    raid: z.string()
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
        const { category, raid } = req.params

        const { page, count, search } = req.query

        const raidDefinition = await getRaidId(raid)

        if (!raidDefinition) {
            return RaidHubRoute.fail(ErrorCode.RaidNotFoundError, {
                raid: raid
            })
        }

        if (search) {
            const data = await searchIndividualRaidLeaderboard({
                raidId: raidDefinition.id,
                membershipId: search,
                take: count,
                column: categoryMap[category]
            })

            if (!data) {
                return RaidHubRoute.fail(ErrorCode.PlayerNotOnLeaderboardError, {
                    membershipId: search
                })
            }

            return RaidHubRoute.ok({
                type: "individual" as const,
                format: "numerical" as const,
                page: data.page,
                count,
                entries: data.entries
            })
        } else {
            const entries = await getIndividualRaidLeaderboard({
                raidId: raidDefinition.id,
                skip: (page - 1) * count,
                take: count,
                column: categoryMap[category]
            })

            return RaidHubRoute.ok({
                type: "individual" as const,
                format: "numerical" as const,
                page,
                count,
                entries
            })
        }
    }
})
