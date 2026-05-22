import "@/schema/registry" // Initialize OpenAPI extensions
import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { zBigIntString, zBoolString, zSplitCommaSeparatedString } from "./input"

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

describe("zSplitCommaSeparatedString", () => {
    test("should fail on non-string non-array input", () => {
        const schema = zSplitCommaSeparatedString(z.any())
        const nonStringValues = [
            123,
            1234567890123456789012345678901234567890123456789012345678901234567890n,
            0,
            NaN,
            {},
            null,
            undefined
        ]

        nonStringValues.forEach(value => {
            const result = schema.safeParse(value)
            expect(result.success).toBe(false)
        })
    })

    test("should coerce empty string to an array with one empty string element", () => {
        const schema = zSplitCommaSeparatedString(z.any())
        const inputValue = ""

        const result = schema.safeParse(inputValue)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data).toEqual([""])
        }
    })

    test("should split comma-separated values", () => {
        const schema = zSplitCommaSeparatedString(z.any())
        const inputValue = "qwe,123,null,NaN,undefined"

        const result = schema.safeParse(inputValue)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data).toEqual(["qwe", "123", "null", "NaN", "undefined"])
        }
    })

    test("should fail on elements not passing the array-item schema", () => {
        const schema = zSplitCommaSeparatedString(zBigIntString())
        const nonconformingInputs = ["", "nah", ",", "123,", "123123123,notanumber"]

        nonconformingInputs.forEach(value => {
            const result = schema.safeParse(value)
            expect(result.success).toBe(false)
        })
    })

    test("should pass on a valid single-value input", () => {
        const schema = zSplitCommaSeparatedString(zBigIntString())
        const singleValueInput = [
            { input: "123", expected: [123n] },
            {
                input: "1234567890123456789012345678901234567890123456789012345678901234567890",
                expected: [1234567890123456789012345678901234567890123456789012345678901234567890n]
            }
        ]

        singleValueInput.forEach(value => {
            const result = schema.safeParse(value.input)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data).toEqual(value.expected)
            }
        })
    })

    test("should pass on a valid multi-value input", () => {
        const schema = zSplitCommaSeparatedString(zBigIntString())
        const singleValueInput = [
            { input: "123,123,123", expected: [123n, 123n, 123n] },
            {
                input: "123,1234567890123456789012345678901234567890123456789012345678901234567890",
                expected: [
                    123n,
                    1234567890123456789012345678901234567890123456789012345678901234567890n
                ]
            },
            {
                input: "11234567890123456789012345678901234567890123456789012345678901234567890,21234567890123456789012345678901234567890123456789012345678901234567890,31234567890123456789012345678901234567890123456789012345678901234567890",
                expected: [
                    1_1234567890123456789012345678901234567890123456789012345678901234567890n,
                    2_1234567890123456789012345678901234567890123456789012345678901234567890n,
                    3_1234567890123456789012345678901234567890123456789012345678901234567890n
                ]
            }
        ]

        singleValueInput.forEach(value => {
            const result = schema.safeParse(value.input)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data).toEqual(value.expected)
            }
        })
    })

    test("should not fail parsing on excessive spaces", () => {
        const schema = zSplitCommaSeparatedString(zBigIntString())
        const validValuesWithExtraSpaces = [
            { input: " 123", expected: [123n] },
            { input: "123 ", expected: [123n] },
            { input: " 123 ", expected: [123n] },
            {
                input: " 1234567890123456789012345678901234567890123456789012345678901234567890",
                expected: [1234567890123456789012345678901234567890123456789012345678901234567890n]
            },
            {
                input: "1234567890123456789012345678901234567890123456789012345678901234567890 ",
                expected: [1234567890123456789012345678901234567890123456789012345678901234567890n]
            },
            {
                input: " 1234567890123456789012345678901234567890123456789012345678901234567890 ",
                expected: [1234567890123456789012345678901234567890123456789012345678901234567890n]
            },
            {
                input: "  123  ,  1234567890123456789012345678901234567890123456789012345678901234567890  ",
                expected: [
                    123n,
                    1234567890123456789012345678901234567890123456789012345678901234567890n
                ]
            }
        ]

        validValuesWithExtraSpaces.forEach(value => {
            const result = schema.safeParse(value.input)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data).toEqual(value.expected)
            }
        })
    })
})
