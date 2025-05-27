import { RaidHubPool, RaidHubPoolTransaction } from "./pool"

export const postgres = new RaidHubPool("readonly", {
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: "raidhub",
    min: process.env.PROD ? 5 : 1,
    max: process.env.PROD ? 150 : 10,
    acquireTimeoutMillis: 1000,
    idleTimeoutMillis: 30000
})

export const postgresWritable = new RaidHubPoolTransaction("writable", {
    user: process.env.POSTGRES_WRITABLE_USER,
    password: process.env.POSTGRES_WRITABLE_PASSWORD,
    database: "raidhub",
    min: 0,
    max: process.env.PROD ? 15 : 3,
    minIdle: 0,
    maxQueue: 100,
    acquireMaxRetries: 2,
    acquireRetryWait: 1000,
    idleTimeoutMillis: 500,
    houseKeepInterval: 500
})
