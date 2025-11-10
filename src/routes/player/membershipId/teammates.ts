import { canAccessProtectedResource } from "@/auth/protected-resource"
import { RaidHubRoute } from "@/core/RaidHubRoute"
import { cacheControl } from "@/middleware/cache-control"
import { zTeammate } from "@/schema/components/Teammate"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zInt64 } from "@/schema/output"
import { getPlayer } from "@/services/player"
import { getTeammates } from "@/services/player-instances/teammates"
import { z } from "zod"

export const playerTeammatesRoute = new RaidHubRoute({
    method: "get",
    description: `Get a list of a player's top 100 teammates.`,
    isProtectedPlayerRoute: true,
    params: z.object({
        membershipId: zInt64()
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
