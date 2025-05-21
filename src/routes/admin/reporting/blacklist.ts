import { RaidHubRoute } from "@/core/RaidHubRoute"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zBigIntString, zInt64, zNaturalNumber } from "@/schema/util"
import { getInstancePlayerInfo } from "@/services/instance/instance"
import { blacklistInstance } from "@/services/reporting/update-blacklist"
import { z } from "zod"

export const blacklistInstanceRoute = new RaidHubRoute({
    method: "patch",
    description: "Blacklist an instance from leaderboards, as well as the players involved.",
    params: z.object({
        instanceId: zBigIntString()
    }),
    body: z.object({
        reportId: zNaturalNumber().nullable(),
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
            schema: z.object({
                instanceId: zInt64(),
                reportId: zNaturalNumber().nullable(),
                reason: z.string(),
                players: z.array(
                    z.object({
                        membershipId: zInt64(),
                        reason: z.string()
                    })
                )
            })
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

        const args = {
            instanceId: String(instanceId),
            reportId: req.body.reportId,
            reason: req.body.reason,
            players: req.body.players.map(player => ({
                membershipId: String(player.membershipId),
                reason: player.reason
            }))
        }

        await blacklistInstance(args)

        return RaidHubRoute.ok(args)
    }
})
