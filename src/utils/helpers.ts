/* eslint-disable @typescript-eslint/no-explicit-any */
export function includedIn<T>(arr: readonly T[], element: any): element is T {
    return arr.includes(element)
}

export function groupBy<T, K extends keyof T, V extends number | string>(
    obj: (T & { [k in K]: V })[],
    key: K,
    opts?: {
        remove?: boolean
    }
) {
    return obj.reduce(
        (rv, x) => {
            ;(rv[x[key]] = rv[x[key]] || []).push(x)
            if (opts?.remove) delete x[key]
            return rv
        },
        {} as Partial<Record<V, Omit<T, K>[]>>
    )
}
