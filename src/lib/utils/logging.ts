import * as Sentry from "@sentry/bun"
import { SeverityLevel } from "@sentry/bun"

enum LogLevel {
    DEBUG,
    INFO,
    WARN,
    ERROR,
    FATAL
}
enum LogLevelPrefix {
    DEBUG = "DEBUG",
    INFO = "INFO",
    WARN = "WARN",
    ERROR = "ERROR",
    FATAL = "FATAL"
}

type LogFieldValue = string | number | boolean | null | undefined
export type LogFields = { [key: string]: LogFields | LogFieldValue }

/**
 * Structured logging utility following RaidHub Services logging standards.
 * Supports DEBUG, INFO, WARN, ERROR, and FATAL levels with Sentry integration.
 */
export class Logger {
    private readonly name: string
    private readonly logLevel: LogLevel
    private readonly isTest: boolean = process.env.NODE_ENV === "test"

    constructor(name: string) {
        this.name = name

        // Parse log level from environment
        const levelString = (
            process.env.LOG_LEVEL || LogLevelPrefix.INFO
        ).toUpperCase() as keyof typeof LogLevel
        this.logLevel = LogLevel[levelString]
    }

    /**
     * Check if a log level should be output based on current log level setting
     */
    private shouldLog(level: LogLevel): boolean {
        return level >= this.logLevel && (!this.isTest || level === LogLevel.FATAL)
    }

    /**
     * Format fields as logfmt-style string
     */
    private formatFields(fields: LogFields): string {
        if (!fields || Object.keys(fields).length === 0) {
            return ""
        }

        return Object.entries(fields)
            .map(([key, value]) => {
                // Serialize objects and arrays as JSON
                let formattedValue: string
                if (value === null || value === undefined) {
                    formattedValue = String(value)
                } else if (typeof value === "object") {
                    formattedValue = JSON.stringify(value)
                } else {
                    formattedValue = String(value)
                }

                // Escape spaces and quotes in values
                if (formattedValue.includes(" ") || formattedValue.includes('"')) {
                    formattedValue = `"${formattedValue.replace(/"/g, '\\"')}"`
                }
                return `${key}=${formattedValue}`
            })
            .join(" ")
    }

    /**
     * Output log message to console
     */
    private output(level: string, logKey: string, fields: LogFields, error?: Error) {
        const loggerTag = `[${this.name}]`
        const levelTag = `[${level}]`
        if (error) {
            fields = { ...fields, error: error.message }
        }
        const fieldsStr = this.formatFields(fields)

        const logLine = `${new Date().toISOString()} ${levelTag}${loggerTag} -- ${logKey} ${fieldsStr && ">> " + fieldsStr}`

        switch (level) {
            case LogLevelPrefix.DEBUG:
                console.debug(logLine)
                break
            case LogLevelPrefix.INFO:
                console.log(logLine)
                break
            case LogLevelPrefix.WARN:
                console.warn(logLine)
                break
            case LogLevelPrefix.ERROR:
                console.error(logLine)
                break
            case LogLevelPrefix.FATAL:
                console.error(logLine)
                process.exit(1)
                break
        }
    }

    private captureSentry(
        level: SeverityLevel,
        logKey: string,
        error: Error,
        fields: LogFields
    ): void {
        if (!process.env.SENTRY_DSN) return
        Sentry.captureException(error, {
            level: level,
            tags: {
                logger: this.name,
                log_key: logKey
            },
            extra: fields
        })
    }

    /**
     * DEBUG: Detailed information for debugging (only shown when LOG_LEVEL=debug)
     */
    debug(logKey: string, fields: LogFields): void {
        if (!this.shouldLog(LogLevel.DEBUG)) return
        this.output(LogLevelPrefix.DEBUG, logKey, fields)
    }

    /**
     * INFO: Operational information for monitoring
     */
    info(logKey: string, fields: LogFields): void {
        if (!this.shouldLog(LogLevel.INFO)) return
        this.output(LogLevelPrefix.INFO, logKey, fields)
    }

    /**
     * WARN: Issues that should be monitored but don't require alerts
     */
    warn(logKey: string, error: Error | null, fields: LogFields): void {
        if (!this.shouldLog(LogLevel.WARN)) return

        this.output(
            LogLevelPrefix.WARN,
            logKey,
            { ...fields, error: error?.message },
            error ?? undefined
        )
    }

    /**
     * ERROR: Errors that should be monitored and alerted on (Sentriable errors)
     */
    error(logKey: string, error: Error, fields: LogFields): void {
        if (!this.shouldLog(LogLevel.ERROR)) return

        const fieldsWithError = { ...fields, error: error.message }

        this.output(LogLevelPrefix.ERROR, logKey, fieldsWithError, error)

        this.captureSentry("error", logKey, error, fieldsWithError)
    }

    /**
     * FATAL: Unrecoverable errors that require the application to crash
     */
    fatal(logKey: string, error: Error, fields: LogFields): never {
        // FATAL always logs (treated as error level)
        const fieldsWithError = { ...fields, error: error.message }

        this.output(LogLevelPrefix.FATAL, logKey, fieldsWithError, error)

        this.captureSentry("fatal", logKey, error, fieldsWithError)

        // Exit the application
        process.exit(1)
    }
}
