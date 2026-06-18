import amqp from "amqplib"

/** AMQP client for publishing to the same broker Hermes consumes (defaults match `RaidHub-Services` / docker-compose). */
export class RabbitConnection {
    private readonly opts: amqp.Options.Connect
    private connection: amqp.Connection | null = null
    private pending: Promise<amqp.Connection> | null = null

    constructor(args: {
        user: string
        password: string
        hostname: string
        port: string | number
        vhost?: string
    }) {
        this.opts = {
            protocol: "amqp",
            hostname: args.hostname,
            port: Number(args.port),
            username: args.user,
            password: args.password,
            vhost: args.vhost?.trim() || "/"
        }
    }

    private async getConnection(): Promise<amqp.Connection> {
        if (this.connection) {
            return this.connection
        }
        if (this.pending) {
            return this.pending
        }
        this.pending = amqp
            .connect(this.opts)
            .then(conn => {
                this.connection = conn
                this.pending = null
                conn.on("error", () => {
                    this.connection = null
                })
                conn.on("close", () => {
                    this.connection = null
                })
                return conn
            })
            .catch(err => {
                this.pending = null
                throw err
            })
        return this.pending
    }

    async createChannel() {
        const conn = await this.getConnection()
        return conn.createChannel()
    }

    $disconnect() {
        void this.connection?.close().catch(() => undefined)
        this.connection = null
        this.pending = null
    }
}
