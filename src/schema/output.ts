import { z } from "zod"

// ===== OUTPUT SCHEMAS (for strict validation of response data) =====

export const zNaturalNumber = () => z.number().int().positive()

export const zWholeNumber = () => z.number().int().nonnegative()

export const zISO8601DateString = () =>
    z.date().openapi({
        type: "string",
        format: "date-time"
    })

// Output param for a BigInt
export const zInt64 = () =>
    z.bigint().openapi({
        type: "string",
        format: "int64"
    })

// Output param for a UInt32
export const zUInt32 = () =>
    z.number().int().nonnegative().openapi({
        format: "uint32"
    })

// Output param for a record key
export const zNumericalRecordKey = (format: "integer" | "uint32" | "uint64" = "integer") =>
    z.coerce.number().int().nonnegative().openapi({
        format
    })
