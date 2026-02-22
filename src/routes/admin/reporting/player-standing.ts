import { RaidHubRoute } from "@/core/RaidHubRoute"
import { zPlayerStandingResponse } from "@/schema/components/PlayerStanding"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zBigIntString } from "@/schema/input"
import { zInt64 } from "@/schema/output"
import { getPlayer } from "@/services/player"
import { getPlayerBlacklistedInstances, getPlayerRecentFlags } from "@/services/reporting/standing"
import { z } from "zod"

export const getPlayerStanding = new RaidHubRoute({
    method: "get",
    description:
        "Get a player's standing information including recent flags and blacklisted instances. Requires authentication.",
    params: z.object({
        membershipId: zBigIntString()
    }),
    response: {
        success: {
            statusCode: 200,
            schema: zPlayerStandingResponse
        },
        errors: [
            {
                statusCode: 404,
                code: ErrorCode.PlayerNotFoundError,
                schema: z.object({
                    membershipId: zInt64()
                })
            }
        ]
    },
    async handler(req) {
        const membershipId = req.params.membershipId

        const [playerInfo, recentFlags, blacklistedInstances] = await Promise.all([
            getPlayer(membershipId),
            getPlayerRecentFlags(membershipId),
            getPlayerBlacklistedInstances(membershipId)
        ])

        if (!playerInfo) {
            return RaidHubRoute.fail(ErrorCode.PlayerNotFoundError, {
                membershipId
            })
        }

        return RaidHubRoute.ok({
            playerInfo,
            recentFlags,
            blacklistedInstances
        })
    }
})
