import { RaidHubRoute } from "@/core/RaidHubRoute"
import { cacheControl } from "@/middleware/cache-control"
import { zLeaderboardData } from "@/schema/components/LeaderboardData"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zLeaderboardPagination } from "@/schema/query/LeaderboardPagination"
import { zBigIntString } from "@/schema/input"
import {
    getContestTeamLeaderboard,
    searchContestTeamLeaderboard
} from "@/services/leaderboard/team/contest"
import { getRaidId } from "@/services/manifest/definitions"
import { z } from "zod"

export const leaderboardTeamContestRoute = new RaidHubRoute({
    method: "get",
    description: `Ranking of all teams which completed the official contest version of the raid during the contest period.`,
    params: z.object({
        raid: z.string()
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
        const { raid } = req.params
        const { page, count, search } = req.query

        const definition = await getRaidId(raid)

        if (!definition) {
            return RaidHubRoute.fail(ErrorCode.RaidNotFoundError, {
                raid: raid
            })
        }

        if (search) {
            const data = await searchContestTeamLeaderboard({
                membershipId: search,
                raidId: definition.id,
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
            const entries = await getContestTeamLeaderboard({
                raidId: definition.id,
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
