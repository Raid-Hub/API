import { RaidHubRoute } from "@/core/RaidHubRoute"
import { cacheControl } from "@/middleware/cache-control"
import { zLeaderboardData } from "@/schema/components/LeaderboardData"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zLeaderboardPagination } from "@/schema/query/LeaderboardPagination"
import { zBigIntString } from "@/schema/util"
import {
    getIndividualPantheonLeaderboard,
    individualPantheonLeaderboardSortColumns,
    searchIndividualPantheonLeaderboard
} from "@/services/leaderboard/individual/pantheon"
import { getVersionId } from "@/services/manifest/definitions"
import { z } from "zod"

const zCategory = z.enum(["clears", "freshClears", "score"])

const categoryMap: Record<
    z.infer<typeof zCategory>,
    (typeof individualPantheonLeaderboardSortColumns)[number]
> = {
    clears: "clears",
    freshClears: "fresh_clears",
    score: "score"
}

export const leaderboardIndividualPantheonRoute = new RaidHubRoute({
    method: "get",
    description: `Individual leaderboards for a specific pantheon version`,
    params: z.object({
        version: z.string(),
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
                code: ErrorCode.PantheonVersionNotFoundError,
                schema: z.object({
                    path: z.string()
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
        const { category, version } = req.params

        const { page, count, search } = req.query

        const versionDefinition = await getVersionId(version, 101)

        if (!versionDefinition) {
            return RaidHubRoute.fail(ErrorCode.PantheonVersionNotFoundError, {
                path: version
            })
        }

        if (search) {
            const data = await searchIndividualPantheonLeaderboard({
                versionId: versionDefinition.id,
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
            const entries = await getIndividualPantheonLeaderboard({
                versionId: versionDefinition.id,
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
