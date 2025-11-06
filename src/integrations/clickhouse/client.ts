import { Logger, LogFields } from "@/lib/utils/logging"
import {
    ClickHouseLogLevel,
    ErrorLogParams,
    LogParams,
    WarnLogParams,
    createClient,
    type Logger as ClickhouseLoggingInterface
} from "@clickhouse/client"

class ClickhouseLogger implements ClickhouseLoggingInterface {
    private logger = new Logger("CLICKHOUSE")

    trace({ module, message, args }: LogParams) {
        this.logger.debug("CLICKHOUSE_TRACE", {
            module,
            message,
            ...(args ? { args: args as LogFields } : {})
        })
    }
    debug({ module, message, args }: LogParams) {
        this.logger.debug("CLICKHOUSE_DEBUG", {
            module,
            message,
            ...(args ? { args: args as LogFields } : {})
        })
    }
    info({ module, message, args }: LogParams) {
        this.logger.info("CLICKHOUSE_INFO", {
            module,
            message,
            ...(args ? { args: args as LogFields } : {})
        })
    }
    warn({ module, message, args, err }: WarnLogParams) {
        this.logger.warn("CLICKHOUSE_WARN", err ?? null, {
            module,
            message,
            ...(args ? { args: args as LogFields } : {})
        })
    }
    error({ module, message, args, err }: ErrorLogParams) {
        if (!err) {
            // ClickHouse error without Error object - create one
            const error = new Error(message || "ClickHouse error")
            this.logger.error("CLICKHOUSE_ERROR", error, {
                module,
                message,
                ...(args ? { args: args as LogFields } : {})
            })
        } else {
            this.logger.error("CLICKHOUSE_ERROR", err, {
                module,
                message,
                ...(args ? { args: args as LogFields } : {})
            })
        }
    }
}

export const clickhouse = createClient({
    username: process.env.CLICKHOUSE_USER,
    password: process.env.CLICKHOUSE_PASSWORD,
    application: process.env.PROD ? "RaidHub-API-Prod" : "RaidHub-API-Dev",
    database: process.env.CLICKHOUSE_DATABASE ?? "default",
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
