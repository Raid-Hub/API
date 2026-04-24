import { configurePostgresParsers } from "./parsers"
import { createReader } from "./reader"
import { createTransactional } from "./transactional"

configurePostgresParsers()

let pgReaderClient: ReturnType<typeof createReader> | null = null
let pgAdminClient: ReturnType<typeof createTransactional> | null = null

/** Match `getFixturePool()` / libpq defaults so tests and app hit the same host:port. */
const postgresConnectionBase = () => ({
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.POSTGRES_PORT || 5432),
    database: "raidhub",
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
})

const getPgReader = () => {
    if (!pgReaderClient) {
        pgReaderClient = createReader({
            ...postgresConnectionBase(),
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            min: process.env.PROD ? 5 : 1,
            max: process.env.PROD ? 150 : 10
        })
    }

    return pgReaderClient
}

const getPgAdmin = () => {
    if (!pgAdminClient) {
        pgAdminClient = createTransactional({
            ...postgresConnectionBase(),
            user: process.env.POSTGRES_WRITABLE_USER,
            password: process.env.POSTGRES_WRITABLE_PASSWORD,
            min: process.env.PROD ? 2 : 1,
            max: process.env.PROD ? 15 : 3
        })
    }

    return pgAdminClient
}

export const pgReader: ReturnType<typeof createReader> = {
    queryRow: (sql, options) => getPgReader().queryRow(sql, options),
    queryRows: (sql, options) => getPgReader().queryRows(sql, options),
    prepare: sql => getPgReader().prepare(sql)
}

export const pgAdmin: ReturnType<typeof createTransactional> = {
    queryRow: (sql, options) => getPgAdmin().queryRow(sql, options),
    queryRows: (sql, options) => getPgAdmin().queryRows(sql, options),
    prepare: sql => getPgAdmin().prepare(sql),
    transaction: callback => getPgAdmin().transaction(callback)
}
