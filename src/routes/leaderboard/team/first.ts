import { RaidHubRoute } from "@/core/RaidHubRoute"
import { cacheControl } from "@/middleware/cache-control"
import { zLeaderboardData } from "@/schema/components/LeaderboardData"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zLeaderboardPagination } from "@/schema/query/LeaderboardPagination"
import { zBigIntString } from "@/schema/input"
import {
    getFirstTeamActivityVersionLeaderboard,
    searchFirstTeamActivityVersionLeaderboard
} from "@/services/leaderboard/team/first"
import { getActivityVersion } from "@/services/manifest/definitions"
import { z } from "zod"

export const leaderboardTeamFirstActivityVersionRoute = new RaidHubRoute({
    method: "get",
    description: `Ranking of the first 1000 completions of each activity version. 
Use the /contest endpoint instead to get the full rankings for the duration of the contest.`,
    params: z.object({
        activity: z.string(),
        version: z.string()
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
                code: ErrorCode.InvalidActivityVersionComboError,
                schema: z.object({
                    activity: z.string(),
                    version: z.string()
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
        const { activity, version } = req.params

        const { page, count, search } = req.query

        const definition = await getActivityVersion(activity, version)

        if (!definition) {
            return RaidHubRoute.fail(ErrorCode.InvalidActivityVersionComboError, {
                activity: activity,
                version: version
            })
        }

        if (search) {
            const data = await searchFirstTeamActivityVersionLeaderboard({
                membershipId: search,
                activityId: definition.activityId,
                versionId: definition.versionId,
                take: count
            })

            if (!data) {
                return RaidHubRoute.fail(ErrorCode.PlayerNotOnLeaderboardError, {
                    membershipId: search
                })
            }

            return RaidHubRoute.ok({
                type: "team" as const,
                format: "duration" as const,
                page: data.page,
                count,
                entries: data.entries
            })
        } else {
            const entries = await getFirstTeamActivityVersionLeaderboard({
                activityId: definition.activityId,
                versionId: definition.versionId,
                skip: (page - 1) * count,
                take: count
            })

            return RaidHubRoute.ok({
                type: "team" as const,
                format: "duration" as const,
                page,
                count,
                entries
            })
        }
    }
})
