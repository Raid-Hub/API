import { types } from "pg"
import { TypeId } from "pg-types"
import { parse as parsePgArray } from "postgres-array"

const parseInt8Value = (value: string | null) => {
    if (value === null) return null
    return BigInt(value)
}

const parseInt8ArrayValue = (value: string) => {
    if (!value) return null
    return parsePgArray(value, (entry: string | null) => parseInt8Value(entry))
}

export const configurePostgresParsers = () => {
    types.setTypeParser(types.builtins.INT8, (val: string) => parseInt8Value(val))
    types.setTypeParser(1016 as TypeId, (val: string) => parseInt8ArrayValue(val))
    types.setTypeParser(types.builtins.JSONB, (val: string) => JSON.parse(val))
}

const MAX_UINT32 = 2n ** 32n - 1n
export function convertUInt32Value(value: unknown, key: string): number | null {
    if (value === null) {
        return null
    }
    if (typeof value !== "bigint") {
        throw new Error(`Key ${key}: Expected a bigint, got a different type`)
    } else if (value <= 0n || value > MAX_UINT32) {
        throw new Error(
            `Key ${key}: Expected a valid UInt32, got a bigint outside of the valid range`
        )
    }
    return Number(value)
}

export function convertStringToBigInt(value: unknown, key: string): bigint | null {
    if (value === null) {
        return null
    }
    if (typeof value !== "string") {
        throw new Error(`Key ${key}: Expected a stringified bigint, got ${typeof value}`)
    }
    return BigInt(value)
}

export function convertStringToDate(value: unknown, key: string): Date | null {
    if (value === null) {
        return null
    }
    if (typeof value !== "string") {
        throw new Error(`Key ${key}: Expected a stringified date, got ${typeof value}`)
    }
    const date = new Date(value)
    if (isNaN(date.getTime())) {
        throw new Error(`Key ${key}: Invalid date string '${value}'`)
    }
    return date
}
