import { RabbitConnection } from "./connection"
import { RabbitQueue } from "./queue"

/** Defaults align with `RaidHub-Services/lib/env/env.go` + docker-compose (`RABBITMQ_USER` / `RABBITMQ_PASSWORD` default dev/password). */
const rabbitmq = new RabbitConnection({
    user: process.env.RABBITMQ_USER ?? "dev",
    password: process.env.RABBITMQ_PASSWORD ?? "password",
    hostname: process.env.RABBITMQ_HOST ?? "localhost",
    port: process.env.RABBITMQ_PORT ?? 5672,
    vhost: process.env.RABBITMQ_VHOST
})

export const playersQueue = new RabbitQueue<bigint>({
    queueName: "player_crawl",
    connection: rabbitmq
})

export const clanQueue = new RabbitQueue<bigint>({
    queueName: "clan_crawl",
    connection: rabbitmq
})

export const instanceCharacterQueue = new RabbitQueue<{
    instanceId: bigint
    membershipId: bigint
    characterId: bigint
}>({
    queueName: "character_fill",
    connection: rabbitmq
})

/** Hermes `discord_role_metadata_sync` worker (linked roles metadata PUT). */
export const discordRoleMetadataSyncQueue = new RabbitQueue<{
    trigger: string
    destinyMembershipIds: string[]
    instanceId: number
}>({
    queueName: "discord_role_metadata_sync",
    connection: rabbitmq
})
