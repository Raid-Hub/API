import {
    ClickHouseLogLevel,
    ErrorLogParams,
    LogParams,
    Logger,
    WarnLogParams,
    createClient
} from "@clickhouse/client"

class ClickhouseLogger implements Logger {
    private formatMessage({
        level,
        module,
        message
    }: {
        level: string
        module: string
        message: string
    }) {
        return `[${level}][@clickhouse/client][${module}] ${message}`
    }
    trace({ module, message, args }: LogParams) {
        const params: unknown[] = [this.formatMessage({ module, message, level: "TRACE" })]
        if (args) {
            params.push("\nArguments:", args)
        }
        console.debug(...params)
    }
    debug({ module, message, args }: LogParams) {
        const params: unknown[] = [this.formatMessage({ module, message, level: "DEBUG" })]
        if (args) {
            params.push("\nArguments:", args)
        }
        console.debug(...params)
    }
    info({ module, message, args }: LogParams) {
        const params: unknown[] = [this.formatMessage({ module, message, level: "INFO" })]
        if (args) {
            params.push("\nArguments:", args)
        }
        console.info(...params)
    }
    warn({ module, message, args, err }: WarnLogParams) {
        const params: unknown[] = [this.formatMessage({ module, message, level: "WARN" })]
        if (args) {
            params.push("\nArguments:", args)
        }
        if (err) {
            params.push("\nCaused by:", err)
        }
        console.warn(...params)
    }
    error({ module, message, args, err }: ErrorLogParams) {
        const params: unknown[] = [this.formatMessage({ module, message, level: "ERROR" })]
        if (args) {
            params.push("\nArguments:", args)
        }
        params.push("\nCaused by:", err)
        console.error(...params)
    }
}

export const clickhouse = createClient({
    username: process.env.CLICKHOUSE_USER,
    password: process.env.CLICKHOUSE_PASSWORD,
    application: process.env.PROD ? "RaidHub-API-Prod" : "RaidHub-API-Dev",
    database: "default",
    request_timeout: 5000,
    log: {
        LoggerClass: ClickhouseLogger,
        level:
            process.env.NODE_ENV === "test"
                ? ClickHouseLogLevel.OFF
                : process.env.PROD
                  ? ClickHouseLogLevel.WARN
                  : ClickHouseLogLevel.DEBUG
    }
})
