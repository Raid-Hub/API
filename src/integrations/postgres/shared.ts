import { postgresConnectionsGauge } from "@/integrations/prometheus/metrics"
import { Logger } from "@/lib/utils/logging"
import { Pool, PoolClient } from "pg"
import { TransformerTree, parseRowsWithTransformers } from "./transformer"

const logger = new Logger("POSTGRES")

export const TABLE_SCHEMAS = [
    "core",
    "definitions",
    "clan",
    "flagging",
    "leaderboard",
    "extended",
    "raw"
]

export type QueryParams = unknown[]

export type QueryOptions = {
    params?: QueryParams
    transformers?: TransformerTree
}

export async function executeQuery<T>(
    client: Pool | PoolClient,
    sql: string,
    operation: string = "query",
    options: QueryOptions = {}
): Promise<T[]> {
    const startTime = Date.now()
    try {
        const result = options.params
            ? await client.query(sql, options.params)
            : await client.query(sql)
        const executeTime = Date.now() - startTime

        logger.debug("QUERY_EXECUTED", {
            duration: `${executeTime}ms`,
            operation,
            sql: sql.substring(0, 200)
        })

        return parseRowsWithTransformers(result.rows, options.transformers) as T[]
    } catch (error) {
        const executeTime = Date.now() - startTime
        const err = error instanceof Error ? error : new Error(String(error))
        logger.warn("QUERY_ERROR", err, {
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
        options: `-c search_path=${TABLE_SCHEMAS.join(",")} -c timezone=UTC`
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
