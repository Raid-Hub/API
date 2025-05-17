import { RaidHubRoute } from "@/RaidHubRoute"
import {
    getInstanceBlacklist,
    getInstanceFlags,
    getInstancePlayerFlags,
    getInstancePlayersStanding
} from "@/data/reporting/standing"
import {
    zInstanceBlacklist,
    zInstanceFlag,
    zInstancePlayerStanding
} from "@/schema/components/InstanceStanding"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zBigIntString, zInt64 } from "@/schema/util"
import { z } from "zod"

export const reportingStandingInstanceRoute = new RaidHubRoute({
    method: "get",
    description:
        "Find a set of instances based on the query parameters. Some parameters will not work together, such as providing a season outside the range of the min/max season. Requires authentication.",
    params: z.object({
        instanceId: zBigIntString()
    }),
    response: {
        success: {
            statusCode: 200,
            schema: z.object({
                instanceId: zInt64(),
                blacklist: zInstanceBlacklist.nullable(),
                flags: z.array(zInstanceFlag),
                players: z.array(zInstancePlayerStanding)
            })
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

        const [blacklist, flags, playerFlags, playersStanding] = await Promise.all([
            getInstanceBlacklist(instanceId),
            getInstanceFlags(instanceId),
            getInstancePlayerFlags(instanceId),
            getInstancePlayersStanding(instanceId)
        ])

        return RaidHubRoute.ok({
            instanceId: String(instanceId),
            blacklist,
            flags,
            players: playersStanding.map(player => ({
                playerInfo: player.playerInfo,
                flags: playerFlags
                    .filter(flag => flag.membershipId === player.playerInfo.membershipId)
                    .map(flag => ({
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
