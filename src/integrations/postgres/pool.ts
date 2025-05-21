import {
    Connection,
    Pool,
    PoolConfiguration,
    QueryOptions,
    ScriptExecuteOptions
} from "postgresql-client"

interface RaidHubQueries {
    queryRow<T>(sql: string, options?: Omit<QueryOptions, "objectRows">): Promise<T | null>
    queryRows<T>(
        sql: string,
        options?: Omit<QueryOptions, "objectRows"> & { fetchCount: number }
    ): Promise<T[]>
}

export class RaidHubPool extends Pool implements RaidHubQueries {
    private connector: RaidHubConnector = new RaidHubConnector(this)
    constructor(config?: PoolConfiguration | string) {
        super(config)
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
}

const QueryOptions = {
    utcDates: true,
    objectRows: true
} as const

export class RaidHubConnector implements RaidHubQueries {
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

    async prepare(sql: string) {
        return await this.connection.prepare(sql)
    }

    async executeCommand(
        sql: string,
        options?: Omit<ScriptExecuteOptions, keyof typeof QueryOptions>
    ) {
        return await this.connection.execute(sql, {
            ...options,
            ...QueryOptions
        })
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
        } catch (error) {
            await conn.rollback()
            throw error
        } finally {
            await this.release(conn)
        }
    }
}
