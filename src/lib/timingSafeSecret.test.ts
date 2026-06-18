import { describe, expect, test } from "bun:test"
import { timingSafeStringEqual } from "./timingSafeSecret"

describe("timingSafeStringEqual", () => {
    test("returns true for identical secrets", () => {
        expect(timingSafeStringEqual("abc", "abc")).toBe(true)
    })

    test("returns false when lengths differ", () => {
        expect(timingSafeStringEqual("abc", "abcd")).toBe(false)
    })

    test("returns false when values differ (same length)", () => {
        expect(timingSafeStringEqual("abc", "xyz")).toBe(false)
    })

    test("returns false when expected is undefined", () => {
        expect(timingSafeStringEqual(undefined, "x")).toBe(false)
    })

    test("returns false when candidate is undefined", () => {
        expect(timingSafeStringEqual("x", undefined)).toBe(false)
    })
})
