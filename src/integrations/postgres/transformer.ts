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

export const parseRowsWithTransformers = (rows: Row[], transformers?: TransformerTree) => {
    if (!rows.length || !transformers) {
        return rows
    }

    // Early exit if the transformers are not applicable to the rows
    const allRowKeys = new Set<string>(Object.keys(rows[0]))
    if (!Object.keys(transformers).some(key => allRowKeys.has(key))) {
        return rows
    }

    return rows.map(row => parseRowWithTransformers(row, transformers))
}

const parseRowWithTransformers = (row: Row, transformers?: TransformerTree) => {
    for (const [key, t] of Object.entries(transformers ?? {})) {
        const value = row[key]
        if (value == null) {
            continue
        } else if (typeof t === "function") {
            if (Array.isArray(value)) {
                // Handle arrays of primitive values
                row[key] = value.map((item, index) => t(item, `${key}[${index}]`))
            } else {
                row[key] = t(value, key)
            }
        } else if (Array.isArray(value)) {
            row[key] = parseRowsWithTransformers(value as Row[], t)
        } else {
            row[key] = parseRowWithTransformers(value as Row, t)
        }
    }
    return row
}
