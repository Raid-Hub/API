import { RabbitQueue } from "./queue"

export const playersQueue = new RabbitQueue<{
    membershipId: bigint | string
}>({
    queueName: "player_requests"
})

export const clanQueue = new RabbitQueue<{
    groupId: bigint | string
}>({
    queueName: "clan"
})

export const instanceCharacterQueue = new RabbitQueue<{
    instanceId: bigint | string
    membershipId: bigint | string
    characterId: bigint | string
}>({
    queueName: "character_fill"
})
