import { Logger } from "@/lib/utils/logging"
import amqp from "amqplib"
import { RabbitConnection } from "./connection"

const logger = new Logger("RABBITMQ")

type Primitive = string | number | bigint | boolean

export class RabbitQueue<T extends Primitive | Record<string, unknown>> {
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
            await this.connect()
            const channel = await this.channel
            if (!channel) {
                throw new Error("Failed to create channel")
            }

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
