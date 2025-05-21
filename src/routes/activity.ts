import { RaidHubRoute } from "@/core/RaidHubRoute"
import { instanceCharacterQueue, playersQueue } from "@/integrations/rabbitmq/queues"
import { cacheControl } from "@/middleware/cache-control"
import { zInstanceExtended } from "@/schema/components/InstanceExtended"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zBigIntString } from "@/schema/util"
import { getInstanceExtended } from "@/services/instance/instance"
import { z } from "zod"

export const activityRoute = new RaidHubRoute({
    method: "get",
    description:
        "This endpoint replaces the PGCR endpoint. It returns an object with a shape more aligned with how RaidHub displays PGCRs.",
    params: z.object({
        instanceId: zBigIntString()
    }),
    middleware: [cacheControl(300)],
    response: {
        success: {
            statusCode: 200,
            schema: zInstanceExtended
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
    async handler(req, after) {
        const instanceId = req.params.instanceId

        const data = await getInstanceExtended(instanceId)

        if (!data) {
            return RaidHubRoute.fail(ErrorCode.InstanceNotFoundError, {
                instanceId: instanceId
            })
        } else {
            after(async () => {
                await Promise.allSettled([
                    Promise.allSettled(
                        data.players.flatMap(player =>
                            player.characters
                                .filter(c => !c.classHash || !c.emblemHash)
                                .map(c =>
                                    instanceCharacterQueue.send({
                                        instanceId,
                                        membershipId: player.playerInfo.membershipId,
                                        characterId: c.characterId
                                    })
                                )
                        )
                    ),
                    Promise.allSettled(
                        data.players.slice(0, 12).map(p =>
                            playersQueue.send({
                                membershipId: p.playerInfo.membershipId
                            })
                        )
                    )
                ])
            })
            return RaidHubRoute.ok(data)
        }
    }
})
