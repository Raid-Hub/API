import { Histogram } from "prom-client"

export const withHistogramTimer = async <K extends string, T>(
    metric: Histogram<K>,
    labels: Partial<Record<K, string | number>>,
    fn: () => Promise<T>
) => {
    const start = Date.now()
    return await fn().finally(() => {
        metric.observe(labels, Date.now() - start)
    })
}
