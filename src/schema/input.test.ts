import { describe, expect, test } from "bun:test"
import "@/schema/registry" // Initialize OpenAPI extensions
import { zBoolString } from "./input"

describe("zBoolString", () => {
    test('should parse string "true" as boolean true', () => {
        const schema = zBoolString()
        const result = schema.safeParse("true")
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data).toBe(true)
        }
    })

    test('should parse string "false" as boolean false', () => {
        const schema = zBoolString()
        const result = schema.safeParse("false")
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data).toBe(false)
        }
    })

    test('should parse string "1" as boolean true', () => {
        const schema = zBoolString()
        const result = schema.safeParse("1")
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data).toBe(true)
        }
    })

    test('should parse string "0" as boolean false', () => {
        const schema = zBoolString()
        const result = schema.safeParse("0")
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data).toBe(false)
        }
    })

    test("should parse boolean true as boolean true", () => {
        const schema = zBoolString()
        const result = schema.safeParse(true)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data).toBe(true)
        }
    })

    test("should parse boolean false as boolean false", () => {
        const schema = zBoolString()
        const result = schema.safeParse(false)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data).toBe(false)
        }
    })

    test("should reject invalid string values", () => {
        const schema = zBoolString()
        const invalidValues = ["yes", "no", "2", "invalid", ""]
        
        invalidValues.forEach(value => {
            const result = schema.safeParse(value)
            expect(result.success).toBe(false)
        })
    })

    test("should reject null", () => {
        const schema = zBoolString()
        const result = schema.safeParse(null)
        expect(result.success).toBe(false)
    })

    test("should reject undefined", () => {
        const schema = zBoolString()
        const result = schema.safeParse(undefined)
        expect(result.success).toBe(false)
    })
})
