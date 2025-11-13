import { canAccessProtectedResource } from "@/auth/protected-resource"
import { RaidHubRoute } from "@/core/RaidHubRoute"
import { playersQueue } from "@/integrations/rabbitmq/queues"
import { cacheControl } from "@/middleware/cache-control"
import { WorldFirstEntry, zPlayerProfile } from "@/schema/components/PlayerProfile"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zBigIntString } from "@/schema/input"
import { zInt64 } from "@/schema/output"
import {
    getPlayer,
    getPlayerActivityStats,
    getPlayerGlobalStats,
    getWorldFirstEntries
} from "@/services/player"
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
                    membershipId: zInt64()
                })
            },
            {
                statusCode: 403,
                code: ErrorCode.PlayerPrivateProfileError,
                schema: z.object({
                    membershipId: zInt64()
                })
            }
        ]
    },
    middleware: [cacheControl(30)],
    async handler(req, after) {
        const membershipId = req.params.membershipId

        // Prefetch, but don't await until permissions are checked
        const statsPromises = Promise.all([
            getPlayerActivityStats(membershipId),
            getPlayerGlobalStats(membershipId),
            getWorldFirstEntries(membershipId)
        ])

        const player = await getPlayer(membershipId)

        after(async () => {
            await playersQueue.send(req.params.membershipId)
        })

        if (!player) {
            return RaidHubRoute.fail(ErrorCode.PlayerNotFoundError, { membershipId })
        } else if (
            player.isPrivate &&
            !(await canAccessProtectedResource(membershipId, req.headers.authorization ?? ""))
        ) {
            return RaidHubRoute.fail(ErrorCode.PlayerPrivateProfileError, { membershipId })
        }

        const [activityStats, globalStats, worldFirstEntries] = await statsPromises

        if (!globalStats) {
            throw new Error(`Unexpected error: global stats for player ${membershipId} not found`)
        }

        return RaidHubRoute.ok({
            playerInfo: player,
            stats: {
                global: globalStats,
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
