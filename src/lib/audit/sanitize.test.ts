import { describe, expect, test } from "bun:test"

import { sanitizeForAudit } from "./sanitize"

describe("sanitizeForAudit", () => {
    test("redacts sensitive keys", () => {
        expect(
            sanitizeForAudit({
                reason: "cheaters",
                password: "hunter2",
                nested: { apiKey: "secret-value" }
            })
        ).toEqual({
            reason: "cheaters",
            password: "[REDACTED]",
            nested: { apiKey: "[REDACTED]" }
        })
    })

    test("truncates long strings", () => {
        const long = "x".repeat(9000)
        const sanitized = sanitizeForAudit(long, { maxStringLength: 100 }) as string
        expect(sanitized.startsWith("x".repeat(100))).toBe(true)
        expect(sanitized).toContain("[truncated")
    })

    test("passes through null and undefined", () => {
        expect(sanitizeForAudit(null)).toBe(null)
        expect(sanitizeForAudit(undefined)).toBe(undefined)
    })

    test("passes through numbers and booleans", () => {
        expect(sanitizeForAudit(42)).toBe(42)
        expect(sanitizeForAudit(false)).toBe(false)
    })

    test("stringifies bigint values", () => {
        expect(sanitizeForAudit(16897747714n)).toBe("16897747714")
    })

    test("sanitizes arrays recursively", () => {
        expect(
            sanitizeForAudit([{ token: "secret" }, "visible", [1, { api_key: "hidden" }]])
        ).toEqual([{ token: "[REDACTED]" }, "visible", [1, { api_key: "[REDACTED]" }]])
    })

    test("redacts custom keys", () => {
        expect(
            sanitizeForAudit({ query: "SELECT 1", note: "safe" }, { redactKeys: ["query"] })
        ).toEqual({ query: "[REDACTED]", note: "safe" })
    })

    test("truncates at max depth", () => {
        let nested: Record<string, unknown> = { value: "leaf" }
        for (let i = 0; i < 10; i++) {
            nested = { nested }
        }

        const sanitized = sanitizeForAudit(nested) as Record<string, unknown>
        let current: unknown = sanitized
        for (let i = 0; i < 8; i++) {
            current = (current as Record<string, unknown>).nested
        }
        expect(current).toEqual({ nested: "[Truncated: max depth]" })
    })

    test("stringifies non-plain values", () => {
        expect(sanitizeForAudit(() => "noop")).toBe('() => "noop"')
        expect(sanitizeForAudit(Symbol("tag"))).toBe("Symbol(tag)")
    })
})
