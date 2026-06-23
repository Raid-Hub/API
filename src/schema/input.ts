import { ZodBooleanDef, ZodDateDef, ZodNullable, ZodStringDef, ZodType, ZodTypeAny, z } from "zod"

// ===== INPUT SCHEMAS (for parsing/coercing user input) =====

/** PostgreSQL signed BIGINT upper bound (membership_id, instance_id, etc.). */
export const PG_BIGINT_MAX = 9223372036854775807n

/** PostgreSQL INTEGER upper bound (duration, season_id, etc.). */
export const PG_INT32_MAX = 2_147_483_647

export const zCoercedNaturalNumber = () => z.coerce.number().int().positive()

export const zCoercedWholeNumber = () => z.coerce.number().int().nonnegative()

/** Whole number that fits in a PostgreSQL INTEGER column. */
export const zPgInt32 = () =>
    zCoercedWholeNumber().max(PG_INT32_MAX, {
        message: `Must be at most ${PG_INT32_MAX}`
    })

export const zPage = () => z.coerce.number().int().positive().default(1)

export const zBoolString = () =>
    // @ts-expect-error - ZodEffects type doesn't match ZodBoolean but the type assertion
    // on line 21 ensures the correct external signature is maintained for API consumers
    z
        .preprocess(val => {
            if (val === "true" || val === "1" || val === 1) return true
            if (val === "false" || val === "0" || val === 0) return false
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

// Input param that will be coerced to a BigInt within PostgreSQL BIGINT range
export const zBigIntString = () =>
    zDigitString()
        .transform(val => BigInt(val))
        .refine(val => val <= PG_BIGINT_MAX, {
            message: `Must be at most ${PG_BIGINT_MAX}`
        })

export const zSplitCommaSeparatedString = <T extends ZodTypeAny, ResultingArray extends ZodTypeAny>(
    itemSchema: T,
    extendArraySchema?: (arraySchema: z.ZodArray<T>) => ResultingArray
) => {
    const finalArraySchema = extendArraySchema
        ? extendArraySchema(z.array(itemSchema))
        : z.array(itemSchema)

    return z.preprocess(val => {
        if (typeof val === "string") {
            return val.split(",").map(s => s.trim())
        }
        return val
    }, finalArraySchema)
}
