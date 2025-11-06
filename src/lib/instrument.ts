import * as Sentry from "@sentry/bun"

// Initialize Sentry (must be called before importing other modules)
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment:
            process.env.SENTRY_ENVIRONMENT || (process.env.PROD ? "production" : "development"),
        tracesSampleRate: process.env.PROD ? 0.01 : 0,
        debug: !process.env.PROD
    })
}
