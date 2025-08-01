import {
    Connection,
    Pool,
    PoolConfiguration,
    PreparedStatement,
    QueryOptions,
    ScriptExecuteOptions
} from "postgresql-client"
import { postgresConnectionsGauge } from "../prometheus/metrics"

interface RaidHubQuerier {
    queryRow<T>(sql: string, options?: Omit<QueryOptions, "objectRows">): Promise<T | null>
    queryRows<T>(
        sql: string,
        options?: Omit<QueryOptions, "objectRows"> & { fetchCount: number }
    ): Promise<T[]>
    prepareStatement(sql: string): Promise<RaidHubStatement>
}

export class RaidHubPool extends Pool implements RaidHubQuerier {
    readonly metricLabel: string
    readonly metricsInterval: Timer
    private readonly connector: RaidHubConnector = new RaidHubConnector(this)

    constructor(metricLabel: string, config?: PoolConfiguration | string) {
        super(config)
        this.metricLabel = metricLabel

        this.metricsInterval = setInterval(() => {
            this.updateGauge("total")
            this.updateGauge("idle")
            this.updateGauge("acquired")
        }, 5000)
    }

    async queryRow<T>(sql: string, options?: Omit<QueryOptions, "objectRows">): Promise<T | null> {
        return await this.connector.queryRow<T>(sql, options)
    }

    async queryRows<T>(
        sql: string,
        options?: Omit<QueryOptions, "objectRows"> & { fetchCount: number }
    ): Promise<T[]> {
        return await this.connector.queryRows<T>(sql, options)
    }
    async prepareStatement(sql: string) {
        return await this.connector.prepareStatement(sql)
    }

    private updateGauge(label: "total" | "idle" | "acquired") {
        let value: number
        switch (label) {
            case "total":
                value = this.totalConnections
                break
            case "idle":
                value = this.idleConnections
                break
            case "acquired":
                value = this.acquiredConnections
                break
        }

        postgresConnectionsGauge.set(
            {
                connection_state: label,
                pool_name: this.metricLabel
            },
            value
        )
    }

    [Symbol.dispose]() {
        clearInterval(this.metricsInterval)
    }
}

const QueryOptions = {
    utcDates: true,
    objectRows: true
} as const

export class RaidHubConnector implements RaidHubQuerier {
    private readonly connection: Pool | Connection
    constructor(connection: Pool | Connection) {
        this.connection = connection
    }

    async queryRow<T>(
        sql: string,
        options?: Omit<QueryOptions, keyof typeof QueryOptions>
    ): Promise<T | null> {
        const { rows, executeTime } = await this.connection.query(sql, {
            ...options,
            ...QueryOptions
        })
        if (!process.env.PROD && process.env.NODE_ENV !== "test") {
            console.log(executeTime, sql)
        }

        if (!rows?.[0]) return null

        return rows[0] as T
    }

    async queryRows<T>(
        sql: string,
        options?: Omit<QueryOptions, keyof typeof QueryOptions> & { fetchCount: number }
    ): Promise<T[]> {
        const { rows, executeTime } = await this.connection.query(sql, {
            ...options,
            ...QueryOptions
        })
        if (!process.env.PROD && process.env.NODE_ENV !== "test") {
            console.log(executeTime, sql)
        }

        return rows as T[]
    }

    async prepareStatement(sql: string) {
        const stmnt = await this.connection.prepare(sql)
        return new RaidHubStatement(stmnt)
    }

    async execute(sql: string, options?: Omit<ScriptExecuteOptions, keyof typeof QueryOptions>) {
        const { results, totalTime } = await this.connection.execute(sql, {
            ...options,
            ...QueryOptions
        })
        if (!process.env.PROD && process.env.NODE_ENV !== "test") {
            results.forEach(({ executeTime }) => {
                console.log(executeTime, executeTime)
            })
            console.log(totalTime, sql)
        }

        return results.map(r => (r.rows ?? []) as unknown[])
    }
}

export class RaidHubPoolTransaction extends RaidHubPool {
    async transaction(cb: (conn: RaidHubConnector) => Promise<void>) {
        const conn = await this.acquire()
        await conn.startTransaction()
        try {
            const result = await cb(new RaidHubConnector(conn))
            await conn.commit()
            return result
        } catch (err) {
            await conn.rollback()
            throw err
        } finally {
            await this.release(conn)
        }
    }
}

class RaidHubStatement {
    private readonly stmnt: PreparedStatement
    constructor(stmnt: PreparedStatement) {
        this.stmnt = stmnt
    }

    async execute(options?: Omit<QueryOptions, keyof typeof QueryOptions>) {
        const { rows, executeTime } = await this.stmnt.execute({
            ...options,
            ...QueryOptions
        })
        if (!process.env.PROD && process.env.NODE_ENV !== "test") {
            console.log(executeTime, this.stmnt.sql)
        }

        return (rows ?? []) as unknown[]
    }

    async close() {
        await this.stmnt.close()
    }
}
