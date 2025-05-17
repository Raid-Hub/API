import { RaidHubRoute } from "@/RaidHubRoute"
import { getPlayer } from "@/data/player"
import { cacheControl } from "@/middlewares/cache-control"
import { processPlayerAsync } from "@/middlewares/processPlayerAsync"
import { zPlayerInfo } from "@/schema/components/PlayerInfo"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zBigIntString } from "@/schema/util"
import { z } from "zod"

export const playerBasicRoute = new RaidHubRoute({
    method: "get",
    description: `An extremely low-cost API call. Get basic information Bungie information about a player. The information is not
guaranteed to be fully up-to-date, however, it should be accurate enough for most use cases where
you only have the membershipId available.`,
    params: z.object({
        membershipId: zBigIntString()
    }),
    middleware: [cacheControl(300), processPlayerAsync],
    response: {
        success: {
            statusCode: 200,
            schema: zPlayerInfo
        },
        errors: [
            {
                statusCode: 404,
                code: ErrorCode.PlayerNotFoundError,
                schema: z.object({
                    membershipId: zBigIntString()
                })
            }
        ]
    },
    async handler(req) {
        const member = await getPlayer(req.params.membershipId)

        if (!member) {
            return RaidHubRoute.fail(ErrorCode.PlayerNotFoundError, {
                membershipId: req.params.membershipId
            })
        } else {
            return RaidHubRoute.ok(member)
        }
    }
})
