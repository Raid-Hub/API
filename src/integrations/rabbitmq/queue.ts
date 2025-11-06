import { Logger } from "@/lib/utils/logging"
import amqp from "amqplib"
import { RabbitConnection } from "./connection"

const logger = new Logger("RABBITMQ")

export class RabbitQueue<T> {
    readonly queueName: string
    private isReady = false
    private isConnecting = false
    private channel: Promise<amqp.Channel | null> = Promise.resolve(null)
    private conn: RabbitConnection

    constructor(args: { queueName: string; connection: RabbitConnection }) {
        this.queueName = args.queueName
        this.conn = args.connection
    }

    private async connect() {
        if (!this.isConnecting && !this.isReady) {
            this.isConnecting = true
            this.channel = this.conn.createChannel().finally(() => {
                this.isReady = true
                this.isConnecting = false
            })
        }
    }

    async send(message: T) {
        try {
            await this.connect()
            const channel = await this.channel
            if (!channel) {
                throw new Error("Failed to create channel")
            }

            return channel.sendToQueue(this.queueName, Buffer.from(JSON.stringify(message)))
        } catch (err) {
            logger.error(
                "RABBITMQ_SEND_FAILED",
                err instanceof Error ? err : new Error(String(err)),
                {
                    queue: this.queueName,
                    operation: "send_message"
                }
            )
        }
    }
}
