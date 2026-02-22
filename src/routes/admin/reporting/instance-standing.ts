import { RaidHubRoute } from "@/core/RaidHubRoute"
import { zInstanceBasic } from "@/schema/components/Instance"
import {
    zInstanceBlacklist,
    zInstanceFlag,
    zInstancePlayerStanding
} from "@/schema/components/InstanceStanding"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zBigIntString } from "@/schema/input"
import { zInt64 } from "@/schema/output"
import { getInstanceBasic } from "@/services/instance/instance"
import {
    getInstanceBlacklist,
    getInstanceFlags,
    getInstancePlayersStanding
} from "@/services/reporting/standing"
import { z } from "zod"

export const reportingStandingInstanceRoute = new RaidHubRoute({
    isAdministratorRoute: true,
    method: "get",
    description:
        "Get the standing information for a specific instance, including flags, blacklist status, and per-player standing data.",
    params: z.object({
        instanceId: zBigIntString()
    }),
    response: {
        success: {
            statusCode: 200,
            schema: z.object({
                instanceDetails: zInstanceBasic,
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
                    instanceId: zInt64()
                })
            }
        ]
    },
    async handler(req) {
        const instanceId = req.params.instanceId

        const [instanceDetails, blacklist, flags, playersStanding] = await Promise.all([
            getInstanceBasic(instanceId),
            getInstanceBlacklist(instanceId),
            getInstanceFlags(instanceId),
            getInstancePlayersStanding(instanceId)
        ])

        if (!instanceDetails) {
            return RaidHubRoute.fail(ErrorCode.InstanceNotFoundError, {
                instanceId
            })
        }

        return RaidHubRoute.ok({
            instanceDetails,
            blacklist,
            flags,
            players: playersStanding
        })
    }
})
