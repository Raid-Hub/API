import { Logger } from "@/lib/utils/logging"
import { Pool, PoolClient, types } from "pg"
import { postgresConnectionsGauge } from "../prometheus/metrics"

const logger = new Logger("POSTGRES")

// Configure bigint (int8) to be parsed as JavaScript BigInt
types.setTypeParser(types.builtins.INT8, (val: string) => {
    return BigInt(val)
})

export const TABLE_SCHEMAS = [
    "core",
    "definitions",
    "clan",
    "flagging",
    "leaderboard",
    "extended",
    "raw",
    "public"
]

export type QueryParams = unknown[]

export async function executeQuery<T>(
    client: Pool | PoolClient,
    sql: string,
    params?: QueryParams,
    operation: string = "query"
): Promise<T[]> {
    const startTime = Date.now()
    try {
        const result = params ? await client.query(sql, params) : await client.query(sql)
        const executeTime = Date.now() - startTime

        logger.debug("QUERY_EXECUTED", {
            duration: `${executeTime}ms`,
            operation,
            sql: sql.substring(0, 200)
        })

        return result.rows as T[]
    } catch (error) {
        const executeTime = Date.now() - startTime
        const err = error instanceof Error ? error : new Error(String(error))
        logger.error("QUERY_ERROR", err, {
            duration: `${executeTime}ms`,
            operation,
            sql: sql.substring(0, 200)
        })
        throw error
    }
}

export function createPool(config: {
    name: string
    user?: string
    password?: string
    database?: string
    host?: string
    port?: number
    min?: number
    max?: number
    idleTimeoutMillis?: number
    connectionTimeoutMillis?: number
}): Pool {
    const pool = new Pool({
        user: config.user,
        password: config.password,
        database: config.database,
        host: config.host || "localhost",
        port: config.port || 5432,
        min: config.min ?? 0,
        max: config.max ?? 10,
        idleTimeoutMillis: config.idleTimeoutMillis ?? 30000,
        connectionTimeoutMillis: config.connectionTimeoutMillis ?? 10000,
        allowExitOnIdle: false,
        options: `-c search_path=${TABLE_SCHEMAS.join(",")}`
    })

    const metricsInterval = setInterval(() => {
        const total = pool.totalCount
        const idle = pool.idleCount
        const waiting = pool.waitingCount

        postgresConnectionsGauge.set({ connection_state: "total", pool_name: config.name }, total)
        postgresConnectionsGauge.set({ connection_state: "idle", pool_name: config.name }, idle)
        postgresConnectionsGauge.set(
            { connection_state: "acquired", pool_name: config.name },
            total - idle
        )
        postgresConnectionsGauge.set(
            { connection_state: "waiting", pool_name: config.name },
            waiting
        )
    }, 5000)

    pool.on("error", err => {
        logger.error("POOL_ERROR", err, { pool: config.name })
    })

    process.on("beforeExit", () => {
        clearInterval(metricsInterval)
        pool.end().catch(err => {
            logger.error(
                "POOL_CLEANUP_ERROR",
                err instanceof Error ? err : new Error(String(err)),
                {}
            )
        })
    })

    return pool
}
