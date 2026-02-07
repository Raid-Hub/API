type RowValue =
    | bigint
    | string
    | number
    | boolean
    | Date
    | null
    | RowValue[]
    | { [key: string]: RowValue }
type Row = { [key: string]: RowValue }

export type TransformerTree = {
    [key: string]: TransformerTree | ((value: RowValue, key: string) => RowValue)
}

export const parseRowsWithTransformers = (
    rows: Row[],
    transformers?: TransformerTree,
    baseKey?: string
) => {
    if (!rows.length || !transformers) {
        return rows
    }

    // Early exit if the transformers are not applicable to the rows
    const allRowKeys = new Set<string>(Object.keys(rows[0]))
    if (!Object.keys(transformers).some(key => allRowKeys.has(key))) {
        return rows
    }

    return rows.map(row => parseRowWithTransformers(row, transformers, baseKey))
}

const parseRowWithTransformers = (row: Row, transformers?: TransformerTree, baseKey?: string) => {
    for (const [key, t] of Object.entries(transformers ?? {})) {
        const value = row[key]
        if (value == null) {
            continue
        } else if (typeof t === "function") {
            if (Array.isArray(value)) {
                // Handle arrays of primitive values
                row[key] = value.map((item, index) => t(item, `${baseKey}.${key}[${index}]`))
            } else {
                row[key] = t(value, `${baseKey}.${key}`)
            }
        } else if (Array.isArray(value)) {
            row[key] = parseRowsWithTransformers(value as Row[], t, `${baseKey}.${key}`)
        } else {
            row[key] = parseRowWithTransformers(value as Row, t, `${baseKey}.${key}`)
        }
    }
    return row
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
    // pg driver maybe return Date objects for timestamp/timestamptz columns
    if (value instanceof Date) {
        return value
    }
    if (typeof value !== "string") {
        throw new Error(`Key ${key}: Expected a stringified date or Date, got ${typeof value}`)
    }
    const date = new Date(value)
    if (isNaN(date.getTime())) {
        throw new Error(`Key ${key}: Invalid date string '${value}'`)
    }
    return date
}
