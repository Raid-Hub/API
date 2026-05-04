import { Logger } from "@/lib/utils/logging"
import amqp from "amqplib"
import { RabbitConnection } from "./connection"

const logger = new Logger("RABBITMQ")

type Primitive = string | number | bigint | boolean

export class RabbitQueue<T extends Primitive | Record<string, unknown>> {
    readonly queueName: string
    private channel: amqp.Channel | null = null
    private channelPromise: Promise<amqp.Channel> | null = null
    private conn: RabbitConnection

    constructor(args: { queueName: string; connection: RabbitConnection }) {
        this.queueName = args.queueName
        this.conn = args.connection
    }

    private async createChannel(): Promise<amqp.Channel> {
        const ch = await this.conn.createChannel()
        ch.on("close", () => this.handleChannelLoss("close"))
        ch.on("error", err =>
            this.handleChannelLoss(
                "error",
                err instanceof Error ? err : new Error(String(err))
            )
        )
        await ch.assertQueue(this.queueName, { durable: true })
        logger.info("RABBITMQ_QUEUE_READY", { queue: this.queueName })
        this.channel = ch
        return ch
    }

    private handleChannelLoss(event: string, err?: Error): void {
        logger.warn("RABBITMQ_CHANNEL_LOST", err ?? null, { queue: this.queueName, event })
        this.channel = null
        this.channelPromise = null
    }

    private async getChannel(): Promise<amqp.Channel> {
        if (this.channel) {
            return this.channel
        }
        if (!this.channelPromise) {
            this.channelPromise = this.createChannel().finally(() => {
                this.channelPromise = null
            })
        }
        return this.channelPromise
    }

    private static primitiveToBuffer(value: Primitive): Buffer {
        switch (typeof value) {
            case "string":
                return Buffer.from(value)
            case "number":
            case "bigint":
                return Buffer.from(value.toString())
            case "boolean":
                return Buffer.from(value ? "true" : "false")
        }
    }

    private async sendBuffer(buffer: Buffer, contentType: string) {
        try {
            const channel = await this.getChannel()
            return channel.sendToQueue(this.queueName, buffer, {
                contentType
            })
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

    /**
     * Send a primitive value (string, number, bigint, boolean)
     */
    async send(value: Primitive & T) {
        const buffer = RabbitQueue.primitiveToBuffer(value)
        return this.sendBuffer(buffer, "text/plain")
    }

    /**
     * Send a JSON object
     */
    async sendJson(value: T extends Primitive ? never : T) {
        const buffer = Buffer.from(JSON.stringify(value))
        return this.sendBuffer(buffer, "application/json")
    }
}
