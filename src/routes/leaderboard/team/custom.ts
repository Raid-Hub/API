import { RaidHubRoute } from "@/core/RaidHubRoute"
import { cacheControl } from "@/middleware/cache-control"
import { zLeaderboardData } from "@/schema/components/LeaderboardData"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zInt64 } from "@/schema/output"
import { zLeaderboardPagination } from "@/schema/query/LeaderboardPagination"
import {
    getPantheonCustomRaceTeamLeaderboard,
    searchPantheonCustomRaceTeamLeaderboard
} from "@/services/leaderboard/team/custom"
import { z } from "zod"

export const leaderboardTeamCustomRoute = new RaidHubRoute({
    method: "get",
    description: `Ranking of teams that completed the 5-feat Insurrection Prime Revolutionary pantheon version during the community-hosted raid race window (first 24 hours from 2026-06-13 17:00 UTC).`,
    query: zLeaderboardPagination,
    response: {
        errors: [
            {
                statusCode: 404,
                code: ErrorCode.PlayerNotOnLeaderboardError,
                schema: z.object({
                    membershipId: zInt64()
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
        const { page, count, search } = req.query

        if (search) {
            const data = await searchPantheonCustomRaceTeamLeaderboard({
                membershipId: search,
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
            const entries = await getPantheonCustomRaceTeamLeaderboard({
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
