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
