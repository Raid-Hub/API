import "@/schema/registry" // Initialize OpenAPI extensions
import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { zBigIntString, zBoolString, zPgInt32, zSplitCommaSeparatedString, PG_BIGINT_MAX } from "./input"

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

describe("zPgInt32", () => {
    test("accepts values within PostgreSQL INTEGER range", () => {
        const schema = zPgInt32()
        expect(schema.safeParse(0).success).toBe(true)
        expect(schema.safeParse(2_147_483_647).success).toBe(true)
    })

    test("rejects values above PostgreSQL INTEGER max", () => {
        const schema = zPgInt32()
        expect(schema.safeParse(10_000_000_000).success).toBe(false)
        expect(schema.safeParse(2_147_483_648).success).toBe(false)
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
                input: String(PG_BIGINT_MAX),
                expected: [PG_BIGINT_MAX]
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

    test("should reject bigint values above PostgreSQL BIGINT max", () => {
        const schema = zBigIntString()
        const tooLarge = String(PG_BIGINT_MAX + 1n)

        expect(schema.safeParse(tooLarge).success).toBe(false)
        expect(schema.safeParse("46116860184306851060").success).toBe(false)
    })

    test("should pass on a valid multi-value input", () => {
        const schema = zSplitCommaSeparatedString(zBigIntString())
        const singleValueInput = [
            { input: "123,123,123", expected: [123n, 123n, 123n] },
            {
                input: `123,${PG_BIGINT_MAX}`,
                expected: [123n, PG_BIGINT_MAX]
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
                input: String(PG_BIGINT_MAX),
                expected: [PG_BIGINT_MAX]
            },
        ]

        validValuesWithExtraSpaces.forEach(value => {
            const result = schema.safeParse(value.input)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data).toEqual(value.expected)
            }
        })
    })

    test("should pass an input array, but still checks the items", () => {
        const schema = zSplitCommaSeparatedString(zBigIntString())
        const invalidArrayInput = [123123n, "qweqwe"]
        const validArrayInput = [123, 123123]

        const invalidResult = schema.safeParse(invalidArrayInput)
        expect(invalidResult.success).toBe(false)

        const validResult = schema.safeParse(validArrayInput)
        expect(validResult.success).toBe(true)
        if (validResult.success) {
            expect(validResult.data).toEqual([123n, 123123n])
        }
    })
})

describe("zPgInt32", () => {
    test("accepts values within PostgreSQL INTEGER range", () => {
        const schema = zPgInt32()
        expect(schema.safeParse(0).success).toBe(true)
        expect(schema.safeParse(2_147_483_647).success).toBe(true)
    })

    test("rejects values above PostgreSQL INTEGER max", () => {
        const schema = zPgInt32()
        expect(schema.safeParse(10_000_000_000).success).toBe(false)
        expect(schema.safeParse(2_147_483_648).success).toBe(false)
    })
})
