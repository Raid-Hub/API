import "@/schema/registry" // Initialize OpenAPI extensions
import { describe, expect, test } from "bun:test"
import { zBoolString } from "./input"

describe("zBoolString", () => {
    test("should parse truthy values correctly", () => {
        const schema = zBoolString()
        const truthyValues = ["true", "1", 1, true]

        truthyValues.forEach(value => {
            const result = schema.safeParse(value)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data).toBe(true)
            }
        })
    })

    test("should parse falsy values correctly", () => {
        const schema = zBoolString()
        const falsyValues = ["false", "0", 0, false]

        falsyValues.forEach(value => {
            const result = schema.safeParse(value)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data).toBe(false)
            }
        })
    })

    test("should reject invalid values", () => {
        const schema = zBoolString()
        const invalidValues = ["yes", "no", "2", "invalid", "", null, undefined]

        invalidValues.forEach(value => {
            const result = schema.safeParse(value)
            expect(result.success).toBe(false)
        })
    })
})
