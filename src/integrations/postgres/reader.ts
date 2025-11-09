import { Pool } from "pg"
import { createPool, executeQuery, QueryOptions } from "./shared"

export const readerMethods = (pool: Pool) => {
    return {
        async queryRow<T>(sql: string, options: QueryOptions = {}): Promise<T | null> {
            const rows = await executeQuery<T>(pool, sql, "query_row", options)
            return (rows[0] as T) || null
        },

        async queryRows<T>(sql: string, options: QueryOptions = {}): Promise<T[]> {
            return executeQuery<T>(pool, sql, "query_rows", options)
        },

        async prepare(sql: string) {
            const client = await pool.connect()
            return {
                async execute<T>(options: QueryOptions = {}): Promise<T[]> {
                    return executeQuery<T>(client, sql, "prepared_statement", options)
                },
                async close() {
                    client.release()
                }
            }
        }
    }
}

export function createReader(config: {
    user?: string
    password?: string
    database?: string
    host?: string
    port?: number
    min?: number
    max?: number
    idleTimeoutMillis?: number
    connectionTimeoutMillis?: number
}) {
    const pool = createPool({ name: "reader", ...config })

    return readerMethods(pool)
}
