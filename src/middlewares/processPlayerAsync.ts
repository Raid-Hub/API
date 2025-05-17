import { playersQueue } from "@/services/rabbitmq/queues"
import { RequestHandler } from "express"

export const processPlayerAsync: RequestHandler<{ membershipId: bigint }> = async (
    req,
    res,
    next
) => {
    res.on("finish", () => {
        playersQueue.send({ membershipId: req.params.membershipId })
    })
    next()
}
