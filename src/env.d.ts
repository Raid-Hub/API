declare module "bun" {
    interface Env {
        NODE_ENV?: "test"
        PROD?: boolean
        PORT?: number
        API_KEYS_PATH: string
        ADMIN_CLIENT_SECRET: string
        CLIENT_SECRET: string
        JWT_SECRET: string
        POSTGRES_USER: string
        POSTGRES_PASSWORD: string
        CLICKHOUSE_USER: string
        CLICKHOUSE_PASSWORD: string
        PROMETHEUS_HTTP_PORT?: number
        SENTRY_DSN?: string
        SENTRY_ENVIRONMENT?: string
        LOG_LEVEL?: "debug" | "info" | "warn" | "error"
        METRICS_PORT?: number
    }
}
