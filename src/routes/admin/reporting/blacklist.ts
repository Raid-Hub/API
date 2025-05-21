import { RaidHubRoute } from "@/core/RaidHubRoute"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zBigIntString, zNaturalNumber } from "@/schema/util"
import { getInstancePlayerInfo } from "@/services/instance/instance"
import { blacklistInstance } from "@/services/reporting/update-blacklist"
import { z } from "zod"

export const blacklistInstanceRoute = new RaidHubRoute({
    method: "put",
    description: "Blacklist an instance from leaderboards, as well as the players involved.",
    params: z.object({
        instanceId: zBigIntString()
    }),
    body: z.object({
        reportId: zNaturalNumber().optional(),
        reason: z.string().min(1),
        players: z.array(
            z.object({
                membershipId: zBigIntString(),
                reason: z.string().min(1)
            })
        )
    }),
    response: {
        success: {
            statusCode: 200,
            schema: z.string()
        },
        errors: [
            {
                statusCode: 400,
                code: ErrorCode.PlayerNotInInstance,
                schema: z.object({
                    instanceId: zBigIntString(),
                    players: z.array(zBigIntString())
                })
            },
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

        const players = await getInstancePlayerInfo(instanceId)

        if (!players.length) {
            return RaidHubRoute.fail(ErrorCode.InstanceNotFoundError, {
                instanceId
            })
        }

        const playersNotInInstance = req.body.players.filter(
            player => !players.find(p => p.membershipId === String(player.membershipId))
        )

        if (playersNotInInstance.length) {
            return RaidHubRoute.fail(ErrorCode.PlayerNotInInstance, {
                instanceId,
                players: playersNotInInstance.map(player => player.membershipId)
            })
        }

        await blacklistInstance({
            instanceId: String(instanceId),
            reportId: req.body.reportId ?? null,
            reason: req.body.reason,
            players: req.body.players.map(player => ({
                membershipId: String(player.membershipId),
                reason: player.reason
            }))
        })

        return RaidHubRoute.ok(`Blacklisted entry for instance ${instanceId} updated or created`)
    }
})
