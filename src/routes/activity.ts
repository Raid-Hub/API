import { z } from "zod"
import { RaidHubRoute } from "../RaidHubRoute"
import { getInstanceExtended } from "../data/instance"
import { cacheControl } from "../middlewares/cache-control"
import { zInstanceExtended } from "../schema/components/InstanceExtended"
import { ErrorCode } from "../schema/errors/ErrorCode"
import { zBigIntString } from "../schema/util"
import { instanceCharacterQueue } from "../services/rabbitmq/queues"

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
                const incompleteChars = data.players
                    .flatMap(player =>
                        player.characters.map(c => ({
                            membershipId: player.playerInfo.membershipId,
                            ...c
                        }))
                    )
                    .filter(c => !c.classHash || !c.emblemHash)

                await Promise.all(
                    incompleteChars.map(c =>
                        instanceCharacterQueue.send({
                            instanceId,
                            membershipId: c.membershipId,
                            characterId: c.characterId
                        })
                    )
                )
            })
            return RaidHubRoute.ok(data)
        }
    }
})
