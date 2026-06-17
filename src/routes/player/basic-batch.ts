import { RaidHubRoute } from "@/core/RaidHubRoute"
import { playersQueue } from "@/integrations/rabbitmq/queues"
import { cacheControl } from "@/middleware/cache-control"
import { zPlayerInfo } from "@/schema/components/PlayerInfo"
import { zBigIntString } from "@/schema/input"
import { getPlayers } from "@/services/player"
import { z } from "zod"

export const playerBasicBatchRoute = new RaidHubRoute({
    method: "post",
    description:
        "Batch variant of `/player/{membershipId}/basic`. Resolves up to 12 players in one round-trip.",
    body: z.object({
        membershipIds: z.array(zBigIntString()).min(1).max(12)
    }),
    middleware: [cacheControl(300)],
    response: {
        success: {
            statusCode: 200,
            schema: z.object({
                players: z.array(zPlayerInfo)
            })
        },
        errors: []
    },
    async handler(req, after) {
        const players = await getPlayers(req.body.membershipIds)

        after(async () => {
            await Promise.all(req.body.membershipIds.map(id => playersQueue.send(id)))
        })

        return RaidHubRoute.ok({ players })
    }
})
