import { z } from "zod"
import { RaidHubRoute } from "../../../RaidHubRoute"
import { getPlayer } from "../../../data/player"
import { getTeammates } from "../../../data/teammates"
import { cacheControl } from "../../../middlewares/cache-control"
import { zTeammate } from "../../../schema/components/Teammate"
import { ErrorCode } from "../../../schema/errors/ErrorCode"
import { zBigIntString } from "../../../schema/util"
import { canAccessProtectedResource } from "../../../util/auth"

export const playerTeammatesRoute = new RaidHubRoute({
    method: "get",
    description: `Get a list of a player's top 100 teammates.`,
    isProtectedPlayerRoute: true,
    params: z.object({
        membershipId: zBigIntString()
    }),
    response: {
        success: {
            statusCode: 200,
            schema: z.array(zTeammate)
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
    middleware: [cacheControl(600)],
    async handler(req) {
        const { membershipId } = req.params

        const player = await getPlayer(membershipId)

        if (!player) {
            return RaidHubRoute.fail(ErrorCode.PlayerNotFoundError, { membershipId })
        } else if (
            player.isPrivate &&
            !(await canAccessProtectedResource(membershipId, req.headers.authorization ?? ""))
        ) {
            return RaidHubRoute.fail(ErrorCode.PlayerPrivateProfileError, { membershipId })
        }

        const teamates = await getTeammates(membershipId, {
            count: 100
        })

        return RaidHubRoute.ok(teamates)
    }
})
