import { configurePostgresParsers } from "./parsers"
import { createReader } from "./reader"
import { createTransactional } from "./transactional"

configurePostgresParsers()

export const pgReader = createReader({
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: "raidhub",
    min: process.env.PROD ? 5 : 1,
    max: process.env.PROD ? 150 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
})

export const pgAdmin = createTransactional({
    user: process.env.POSTGRES_WRITABLE_USER,
    password: process.env.POSTGRES_WRITABLE_PASSWORD,
    database: "raidhub",
    min: process.env.PROD ? 2 : 1,
    max: process.env.PROD ? 15 : 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
})
