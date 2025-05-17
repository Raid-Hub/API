import { RaidHubRoute } from "@/RaidHubRoute"
import {
    getPlayer,
    getPlayerActivityStats,
    getPlayerGlobalStats,
    getWorldFirstEntries
} from "@/data/player"
import { cacheControl } from "@/middlewares/cache-control"
import { processPlayerAsync } from "@/middlewares/processPlayerAsync"
import { WorldFirstEntry, zPlayerProfile } from "@/schema/components/PlayerProfile"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zBigIntString } from "@/schema/util"
import { canAccessProtectedResource } from "@/utils/auth"
import { z } from "zod"

export const playerProfileRoute = new RaidHubRoute({
    method: "get",
    description: `Get a player's profile information. This includes global stats, activity stats, and world first entries. 
This is used to hydrate the RaidHub profile page`,
    isProtectedPlayerRoute: true,
    params: z.object({
        membershipId: zBigIntString()
    }),
    response: {
        success: {
            statusCode: 200,
            schema: zPlayerProfile
        },
        errors: [
            {
                statusCode: 404,
                code: ErrorCode.PlayerNotFoundError,
                schema: z.object({
                    membershipId: zBigIntString()
                })
            },
            {
                statusCode: 403,
                code: ErrorCode.PlayerPrivateProfileError,
                schema: z.object({
                    membershipId: zBigIntString()
                })
            }
        ]
    },
    middleware: [cacheControl(30), processPlayerAsync],
    async handler(req) {
        const membershipId = req.params.membershipId

        // Prefetch, but don't await until permissions are checked
        const statsPromises = Promise.all([
            getPlayerActivityStats(membershipId),
            getPlayerGlobalStats(membershipId),
            getWorldFirstEntries(membershipId)
        ])

        const player = await getPlayer(membershipId)

        if (!player) {
            return RaidHubRoute.fail(ErrorCode.PlayerNotFoundError, { membershipId })
        } else if (
            player.isPrivate &&
            !(await canAccessProtectedResource(membershipId, req.headers.authorization ?? ""))
        ) {
            return RaidHubRoute.fail(ErrorCode.PlayerPrivateProfileError, { membershipId })
        }

        const [activityStats, globalStats, worldFirstEntries] = await statsPromises

        return RaidHubRoute.ok({
            playerInfo: player,
            stats: {
                global: globalStats ?? {
                    clears: null,
                    freshClears: null,
                    sherpas: null,
                    sumOfBest: null
                },
                activity: Object.fromEntries(activityStats.map(stat => [stat.activityId, stat]))
            },
            worldFirstEntries: Object.fromEntries(
                worldFirstEntries.map(
                    entry =>
                        [entry.activityId, entry.rank === null ? null : entry] as [
                            number,
                            WorldFirstEntry | null
                        ]
                )
            )
        })
    }
})
