import { RabbitConnection } from "./connection"
import { RabbitQueue } from "./queue"

const rabbitmq = new RabbitConnection({
    user: process.env.RABBITMQ_USER ?? "guest",
    password: process.env.RABBITMQ_PASSWORD ?? "guest",
    port: process.env.RABBITMQ_PORT ?? 5672
})

export const playersQueue = new RabbitQueue<{
    membershipId: bigint | string
}>({
    queueName: "player_requests",
    connection: rabbitmq
})

export const clanQueue = new RabbitQueue<{
    groupId: bigint | string
}>({
    queueName: "clan",
    connection: rabbitmq
})

export const instanceCharacterQueue = new RabbitQueue<{
    instanceId: bigint | string
    membershipId: bigint | string
    characterId: bigint | string
}>({
    queueName: "character_fill",
    connection: rabbitmq
})
