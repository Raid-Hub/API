import { Pool, PoolConfiguration, QueryOptions } from "postgresql-client"

class RaidHubPool extends Pool {
    constructor(config?: PoolConfiguration | string) {
        super(config)
    }

    async queryRow<T>(sql: string, options?: Omit<QueryOptions, "objectRows">): Promise<T | null> {
        const { rows, executeTime } = await this.query(sql, {
            ...options,
            objectRows: true
        })
        if (!process.env.PROD && process.env.NODE_ENV !== "test") {
            console.log(executeTime, sql)
        }

        if (!rows?.[0]) return null

        return rows[0] as T
    }

    async queryRows<T>(
        sql: string,
        options?: Omit<QueryOptions, "objectRows"> & { fetchCount: number }
    ): Promise<T[]> {
        const { rows, executeTime } = await this.query(sql, {
            ...options,
            objectRows: true
        })
        if (!process.env.PROD && process.env.NODE_ENV !== "test") {
            console.log(executeTime, sql)
        }

        return rows as T[]
    }

    async tx() {
        ;(await postgres.acquire()).startTransaction
    }
}
export const postgres = new RaidHubPool({
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: "raidhub",
    min: process.env.PROD ? 5 : 1,
    max: process.env.PROD ? 100 : 10,
    acquireTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
})
