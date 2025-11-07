import { createPool, executeQuery, QueryParams } from "./shared"

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

    return {
        async queryRow<T>(sql: string, params?: QueryParams): Promise<T | null> {
            const rows = await executeQuery<T>(pool, sql, params, "query_row")
            return (rows[0] as T) || null
        },

        async queryRows<T>(sql: string, params?: QueryParams): Promise<T[]> {
            return executeQuery<T>(pool, sql, params, "query_rows")
        },

        async prepare(sql: string) {
            const client = await pool.connect()
            return {
                async execute<T>(params?: QueryParams): Promise<T[]> {
                    return executeQuery<T>(client, sql, params, "prepared_statement")
                },
                async close() {
                    client.release()
                }
            }
        }
    }
}
