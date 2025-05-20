import { RaidHubRoute } from "@/RaidHubRoute"
import { getInstanceBasic } from "@/data/instance"
import {
    getInstanceBlacklist,
    getInstanceFlags,
    getInstancePlayerFlags,
    getInstancePlayersStanding
} from "@/data/reporting/standing"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zBigIntString } from "@/schema/util"
import { z } from "zod"

export const blacklistInstance = new RaidHubRoute({
    method: "patch",
    description:
        "Find a set of instances based on the query parameters. Some parameters will not work together, such as providing a season outside the range of the min/max season. Requires authentication.",
    params: z.object({
        instanceId: zBigIntString()
    }),
    body: z.object({
        instance: z.object({}),
        players: z.array(z.object({}))
    }),
    response: {
        success: {
            statusCode: 200,
            schema: z.null()
        },
        errors: [
            {
                statusCode: 404,
                code: ErrorCode.InstanceNotFoundError,
                schema: z.object({
                    instanceId: zBigIntString()
                })
            }
        ]
    },
    async handler(req) {
        const instanceId = req.params.instanceId

        const [instanceDetails, blacklist, flags, playerFlags, playersStanding] = await Promise.all(
            [
                getInstanceBasic(instanceId),
                getInstanceBlacklist(instanceId),
                getInstanceFlags(instanceId),
                getInstancePlayerFlags(instanceId),
                getInstancePlayersStanding(instanceId)
            ]
        )

        if (!instanceDetails) {
            return RaidHubRoute.fail(ErrorCode.InstanceNotFoundError, {
                instanceId
            })
        }

        return RaidHubRoute.ok({
            instanceDetails,
            blacklist,
            flags,
            players: playersStanding.map(player => ({
                playerInfo: player.playerInfo,
                flags: playerFlags
                    .filter(flag => flag.membershipId === player.playerInfo.membershipId)
                    .map(flag => ({
                        instanceId: flag.instanceId,
                        membershipId: flag.membershipId,
                        flaggedAt: flag.flaggedAt,
                        cheatCheckVersion: flag.cheatCheckVersion,
                        cheatProbability: flag.cheatProbability,
                        cheatCheckBitmask: flag.cheatCheckBitmask
                    })),
                clears: player.clears,
                cheatLevel: player.cheatLevel,
                blacklistedInstances: player.blacklistedInstances,
                otherRecentFlags: player.otherRecentFlags
            }))
        })
    }
})
