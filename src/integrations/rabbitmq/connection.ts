import amqp from "amqplib"

export class RabbitConnection {
    private user: string
    private password: string
    private port: number
    private isReady = false
    private isConnecting = false
    private conn: Promise<amqp.Connection | null> = Promise.resolve(null)

    constructor(args: { user: string; password: string; port: string | number }) {
        this.user = args.user
        this.password = args.password
        this.port = parseInt(args.port.toString())
    }

    private async connect() {
        if (!this.isConnecting && !this.isReady) {
            this.isConnecting = true
            this.conn = amqp
                .connect(`amqp://${this.user}:${this.password}@localhost:${this.port}`)
                .finally(() => {
                    this.isConnecting = false
                    this.isReady = true
                })
            await this.conn
        }
    }

    async createChannel() {
        await this.connect()
        const conn = await this.conn
        if (!conn) {
            throw new Error("Failed to connect to RabbitMQ")
        }
        return await conn.createChannel()
    }

    $disconnect() {
        this.conn.then(conn => conn?.close())
    }
}
