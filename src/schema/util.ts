import { ZodBooleanDef, ZodDateDef, ZodNullable, ZodStringDef, ZodType, z } from "zod"

export const zNaturalNumber = () => z.number().int().positive()

export const zWholeNumber = () => z.number().int().nonnegative()

export const zCoercedNaturalNumber = () => z.coerce.number().int().positive()

export const zCoercedWholeNumber = () => z.coerce.number().int().nonnegative()

export const zPage = () => z.coerce.number().int().positive().default(1)

export const zSplitCommaSeparatedString = <T extends z.ZodTypeAny>(schema: T) =>
    z.preprocess(val => {
        if (typeof val === "string") {
            return val.split(",")
        }
        return val
    }, schema)

export const zBoolString = () =>
    z.coerce.boolean().openapi({
        type: "boolean"
    }) as ZodType<boolean, ZodBooleanDef, string | number | boolean>

export const zISODateString = <N extends boolean = false>({
    nullable
}: {
    nullable?: N
} = {}): N extends true
    ? ZodNullable<ZodType<Date, ZodDateDef, string | number | Date>>
    : ZodType<Date, ZodDateDef, string | number | Date> => {
    // @ts-expect-error nullablle not supported in spec v3.1
    const base = z.coerce.date().openapi({
        type: "string",
        format: "date-time",
        nullable: nullable
    })

    // @ts-expect-error generic hell
    return nullable ? base.nullable() : base
}

// Intended to be used as an input param
export const zDigitString = () =>
    z.coerce.string().regex(/^\d+n?$/) as ZodType<string, ZodStringDef, number | string | bigint>

// Intended to be used as an input param that will be coerced to a BigInt
export const zBigIntString = () => zDigitString().pipe(z.coerce.bigint())

// Intended to be used as an output param for a BigInt
export const zInt64 = () =>
    z.string().regex(/^\d+/).openapi({
        type: "string",
        format: "int64"
    })

// Intended to be used as an output param for a UInt32
export const zUInt32 = () =>
    z.number().int().nonnegative().openapi({
        format: "uint32"
    })

// Intended to be used as an output param for a record key
export const zNumericalRecordKey = (format: "integer" | "uint32" | "uint64" = "integer") =>
    z.coerce.number().int().nonnegative().openapi({
        format
    })
