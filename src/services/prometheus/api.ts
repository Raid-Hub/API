export type QueryRangeResponse = {
    status: "success"
    data: {
        result: {
            metric: unknown
            values: [number, string][]
        }[]
    }
}

export type QueryResponse = {
    status: "success"
    data: {
        result: {
            metric: unknown
            value: [number, string]
        }[]
    }
}

const BASE_URL = `http://localhost:${process.env.PROMETHEUS_HTTP_PORT ?? 9090}/api/v1`

export const queryRange = async (opts: {
    query: string
    start: Date
    end: Date
    step: string
}): Promise<QueryRangeResponse> => {
    const url = new URL(BASE_URL + "/query_range")
    url.searchParams.set("query", opts.query)
    url.searchParams.set("start", opts.start.toISOString())
    url.searchParams.set("end", opts.end.toISOString())
    url.searchParams.set("step", opts.step)

    const res = await fetch(url)

    if (!res.ok) {
        throw new Error(`Prometheus HTTP Error: ${res.status}: ${res.statusText}`, {
            cause: res
        })
    }

    return (await res.json()) as QueryRangeResponse
}

export const query = async (opts: { query: string }): Promise<QueryResponse> => {
    const url = new URL(BASE_URL + "/query")
    url.searchParams.set("query", opts.query)

    const response = await fetch(url)
    return (await response.json()) as QueryResponse
}
