import { RaidHubPool, RaidHubPoolTransaction } from "./pool"

export const postgres = new RaidHubPool({
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: "raidhub",
    min: process.env.PROD ? 5 : 1,
    max: process.env.PROD ? 100 : 10,
    acquireTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
})

export const postgresWritable = new RaidHubPoolTransaction({
    user: process.env.POSTGRES_WRITABLE_USER,
    password: process.env.POSTGRES_WRITABLE_USER,
    database: "raidhub",
    min: 1,
    max: 3
})
