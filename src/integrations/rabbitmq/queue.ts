import amqp from "amqplib"
import { RabbitConnection } from "./connection"

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
            process.env.NODE_ENV !== "test" &&
                console.error(
                    new Error("Failed to send message via RabbitMQ", {
                        cause: err
                    })
                )
        }
    }
}
