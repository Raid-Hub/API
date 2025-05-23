declare global {
    interface Array<T> {
        includes(searchElement: unknown, fromIndex?: number): searchElement is T
    }
}

declare global {
    interface ReadonlyArray<T> {
        includes(searchElement: unknown, fromIndex?: number): searchElement is T
    }
}

export {}
