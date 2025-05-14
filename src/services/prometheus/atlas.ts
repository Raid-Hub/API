import { queryRange } from "./api"

const intervalMins = 5
const step = "15s"

export const getAtlasStatus = async (): Promise<
    | {
          isCrawling: true
          lag: number
          estimatedCatchUpTime: number
      }
    | {
          isCrawling: false
          lag: null
      }
> => {
    const now = Date.now()
    const queryRangeResponse = await queryRange({
        query: "histogram_quantile(0.50, sum(rate(pgcr_crawl_summary_lag_bucket[2m])) by (le))",
        start: new Date(now - intervalMins * 60000),
        end: new Date(now),
        step
    })

    const values = queryRangeResponse.data?.result[0]?.values
        .map(([timestamp, lag]) => ({
            timestamp: timestamp * 1000,
            lag: parseFloat(lag)
        }))
        .filter(({ lag }) => lag > 2.5)

    if (!values?.length) {
        return { isCrawling: false, lag: null }
    }

    const mostRecentTimestamp = values[values.length - 1].timestamp
    const skew = now - mostRecentTimestamp

    if (skew >= 30_000) {
        return { isCrawling: false, lag: null }
    }

    // Calculate the weighted average of the lag values
    const { totalWeight, sum } = values.slice(-Math.min(values.length - 1, 6)).reduce<{
        totalWeight: number
        sum: number
    }>(
        (acc, { lag }, idx) => ({
            totalWeight: acc.totalWeight + (idx + 1),
            sum: acc.sum + lag * (idx + 1)
        }),
        {
            totalWeight: 0,
            sum: 0
        }
    )
    const weightedLag = sum / totalWeight

    if (weightedLag <= 60) {
        return {
            isCrawling: true,
            lag: weightedLag,
            estimatedCatchUpTime: 0
        }
    }

    // Get the rate of change of the increase in lag over the last 5 minutes using 3 points
    const oldest = values[0]
    const middle = values[Math.floor(values.length / 2)]
    const newest = values[values.length - 1]

    // Measured in seconds per second
    const rateA = ((middle.lag - newest.lag) / (middle.timestamp - newest.timestamp)) * 1000
    const rateB = ((oldest.lag - middle.lag) / (oldest.timestamp - middle.timestamp)) * 1000

    // Calculate the weighted average of the rates, seconds per second
    const weightedRate = (2 * rateA + rateB) / 3

    if (weightedRate > 0) {
        return {
            isCrawling: true,
            lag: weightedLag,
            estimatedCatchUpTime: -1
        }
    }

    // The crawler is at least 30 seconds behind, so 30s marks being caught up
    // Then add an additional 60 seconds as a buffer
    const estimatedCatchUpTime = (weightedLag - 30) / (-weightedRate + 1) + 60

    return {
        isCrawling: true,
        lag: weightedLag,
        estimatedCatchUpTime
    }
}
