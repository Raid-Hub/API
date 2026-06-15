const DEFAULT_REDACT_KEYS = new Set([
    "password",
    "token",
    "secret",
    "authorization",
    "apikey",
    "api_key"
])

const DEFAULT_MAX_STRING_LENGTH = 8_192

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value)

export type SanitizeForAuditOptions = {
    redactKeys?: readonly string[]
    maxStringLength?: number
}

export const sanitizeForAudit = (
    value: unknown,
    options: SanitizeForAuditOptions = {}
): unknown => {
    const redactKeys = new Set([
        ...DEFAULT_REDACT_KEYS,
        ...(options.redactKeys ?? []).map(k => k.toLowerCase())
    ])
    const maxStringLength = options.maxStringLength ?? DEFAULT_MAX_STRING_LENGTH

    const sanitize = (current: unknown, depth: number): unknown => {
        if (depth > 8) {
            return "[Truncated: max depth]"
        }

        if (current === null || current === undefined) {
            return current
        }

        if (typeof current === "string") {
            if (current.length <= maxStringLength) {
                return current
            }
            return `${current.slice(0, maxStringLength)}…[truncated ${current.length - maxStringLength} chars]`
        }

        if (typeof current === "number" || typeof current === "boolean") {
            return current
        }

        if (typeof current === "bigint") {
            return current.toString()
        }

        if (Array.isArray(current)) {
            return current.map(item => sanitize(item, depth + 1))
        }

        if (!isPlainObject(current)) {
            return String(current)
        }

        const sanitized: Record<string, unknown> = {}
        for (const [key, nested] of Object.entries(current)) {
            if (redactKeys.has(key.toLowerCase())) {
                sanitized[key] = "[REDACTED]"
                continue
            }
            sanitized[key] = sanitize(nested, depth + 1)
        }
        return sanitized
    }

    return sanitize(value, 0)
}
