import { ZodBooleanDef, ZodDateDef, ZodNullable, ZodStringDef, ZodType, ZodTypeAny, z } from "zod"

// ===== INPUT SCHEMAS (for parsing/coercing user input) =====

export const zCoercedNaturalNumber = () => z.coerce.number().int().positive()

export const zCoercedWholeNumber = () => z.coerce.number().int().nonnegative()

export const zPage = () => z.coerce.number().int().positive().default(1)

export const zBoolString = () =>
    // @ts-expect-error - ZodEffects type doesn't match ZodBoolean but functionally works
    z
        .preprocess(val => {
            if (val === "true" || val === "1") return true
            if (val === "false" || val === "0") return false
            return val
        }, z.boolean())
        .openapi({
            type: "boolean"
        }) as ZodType<boolean, ZodBooleanDef, string | number | boolean>

export const zDateString = <N extends boolean = false>({
    nullable
}: {
    nullable?: N
} = {}): N extends true
    ? ZodNullable<ZodType<Date, ZodDateDef, string | number | Date>>
    : ZodType<Date, ZodDateDef, string | number | Date> => {
    const base = z.coerce.date().openapi({
        type: "string",
        format: "date-time"
    })

    // @ts-expect-error generic hell
    return nullable ? base.nullable().openapi({ nullable: true }) : base
}

// Input param that accepts string representations of digits
export const zDigitString = () =>
    z.coerce.string().regex(/^\d+n?$/) as ZodType<string, ZodStringDef, number | string | bigint>

// Input param that will be coerced to a BigInt
export const zBigIntString = () => zDigitString().transform(val => BigInt(val))

export const zSplitCommaSeparatedString = <T extends ZodTypeAny>(schema: T) =>
    z.array(
        z.preprocess(val => {
            if (typeof val === "string") {
                return val.split(",")
            }
            return val
        }, schema)
    )
