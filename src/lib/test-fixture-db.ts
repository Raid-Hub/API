import { Pool } from "pg"

let fixturePool: Pool | null = null

/**
 * Single shared pool for test DB fixtures (bounded connections when many test files run in parallel).
 */
export function getFixturePool(): Pool {
    if (!fixturePool) {
        fixturePool = new Pool({
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: "raidhub",
            host: process.env.POSTGRES_HOST || "localhost",
            port: Number(process.env.POSTGRES_PORT || 5432),
            max: 4,
            idleTimeoutMillis: 2000
        })
    }
    return fixturePool
}
