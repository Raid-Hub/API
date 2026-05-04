import { Logger } from "@/lib/utils/logging"
import amqp from "amqplib"

const logger = new Logger("RABBITMQ")

const INITIAL_RETRY_DELAY_MS = parseInt(process.env.RABBITMQ_RETRY_INITIAL_DELAY_MS ?? "1000")
const MAX_RETRY_DELAY_MS = parseInt(process.env.RABBITMQ_RETRY_MAX_DELAY_MS ?? "30000")

export function jitteredDelay(attempt: number): number {
    const exponential = Math.min(INITIAL_RETRY_DELAY_MS * 2 ** attempt, MAX_RETRY_DELAY_MS)
    return exponential * (0.5 + 0.5 * Math.random())
}

export class RabbitConnection {
    private readonly user: string
    private readonly password: string
    private readonly port: number
    private readonly heartbeat: number
    private conn: amqp.Connection | null = null
    private connectPromise: Promise<void> | null = null
    private destroyed = false

    constructor(args: {
        user: string
        password: string
        port: string | number
        heartbeat?: number
    }) {
        this.user = args.user
        this.password = args.password
        this.port = parseInt(args.port.toString())
        this.heartbeat = args.heartbeat ?? parseInt(process.env.RABBITMQ_HEARTBEAT ?? "60")
    }

    private async connectWithRetry(): Promise<void> {
        let attempt = 0
        while (!this.destroyed) {
            if (attempt > 0) {
                const delay = jitteredDelay(attempt - 1)
                logger.info("RABBITMQ_RECONNECTING", { attempt, delayMs: Math.round(delay) })
                await new Promise(resolve => setTimeout(resolve, delay))
            }
            try {
                const conn = await amqp.connect(
                    `amqp://${this.user}:${this.password}@localhost:${this.port}`,
                    { heartbeat: this.heartbeat }
                )
                this.conn = conn
                logger.info("RABBITMQ_CONNECTED", { attempt })
                conn.on("close", () => this.handleConnectionLoss("close"))
                conn.on("error", err =>
                    this.handleConnectionLoss(
                        "error",
                        err instanceof Error ? err : new Error(String(err))
                    )
                )
                return
            } catch (err) {
                logger.warn(
                    "RABBITMQ_CONNECT_FAILED",
                    err instanceof Error ? err : new Error(String(err)),
                    { attempt }
                )
                attempt++
            }
        }
    }

    private handleConnectionLoss(event: string, err?: Error): void {
        if (this.conn) {
            logger.warn("RABBITMQ_CONNECTION_LOST", err ?? null, { event })
            this.conn = null
        }
        if (!this.destroyed && !this.connectPromise) {
            this.connectPromise = this.connectWithRetry().finally(() => {
                this.connectPromise = null
            })
        }
    }

    async createChannel(): Promise<amqp.Channel> {
        if (!this.conn) {
            if (!this.connectPromise) {
                this.connectPromise = this.connectWithRetry().finally(() => {
                    this.connectPromise = null
                })
            }
            await this.connectPromise
        }
        const conn = this.conn
        if (!conn) {
            throw new Error("Failed to connect to RabbitMQ")
        }
        return conn.createChannel()
    }

    $disconnect(): void {
        this.destroyed = true
        this.conn?.close()
    }
}
