import { readerMethods } from "./reader"
import { createPool, executeQuery, QueryOptions } from "./shared"

export function createTransactional(config: {
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
    const pool = createPool({ name: "transactional", ...config })

    const queryMethods = readerMethods(pool)

    return {
        ...queryMethods,
        async transaction<T>(
            callback: (tx: {
                queryRow<T>(sql: string, options?: QueryOptions): Promise<T | null>
                queryRows<T>(sql: string, options?: QueryOptions): Promise<T[]>
                prepare(sql: string): Promise<{
                    execute<T>(options?: QueryOptions): Promise<T[]>
                    close(): Promise<void>
                }>
            }) => Promise<T>
        ): Promise<T> {
            const client = await pool.connect()
            const tx = {
                async queryRow<T>(sql: string, options: QueryOptions = {}): Promise<T | null> {
                    const rows = await executeQuery<T>(client, sql, "query_row", options)
                    return (rows[0] as T) || null
                },
                async queryRows<T>(sql: string, options: QueryOptions = {}): Promise<T[]> {
                    return executeQuery<T>(client, sql, "query_rows", options)
                },
                async prepare(sql: string) {
                    return {
                        async execute<T>(options: QueryOptions = {}): Promise<T[]> {
                            return executeQuery<T>(client, sql, "prepared_statement", options)
                        },
                        async close() {
                            // No-op in transaction, client released at end
                        }
                    }
                }
            }

            try {
                await client.query("BEGIN")
                const result = await callback(tx)
                await client.query("COMMIT")
                return result
            } catch (error) {
                await client.query("ROLLBACK")
                throw error
            } finally {
                client.release()
            }
        }
    }
}
