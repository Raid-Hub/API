import { Histogram } from "prom-client"

export const httpRequestTimer = new Histogram({
    name: "incoming_api_request_duration_ms",
    help: "Duration of HTTP requests in ms",
    labelNames: ["path", "status_code"],
    buckets: [0.1, 1, 5, 15, 50, 100, 200, 300, 400, 500, 1000, 2000, 5000, 10000]
})

const QueryBuckets = [0.1, 0.5, 1, 5, 10, 50, 100, 250, 500, 1000, 5000, 10000]

export const activityHistoryQueryTimer = new Histogram({
    name: "activity_history_query_duration_ms",
    help: "Duration of activity history queries in ms",
    labelNames: ["count", "cutoff", "cursor"],
    buckets: QueryBuckets
})

export const playerProfileQueryTimer = new Histogram({
    name: "player_profile_query_duration_ms",
    help: "Duration of player profile queries in ms",
    labelNames: ["method"],
    buckets: QueryBuckets
})

export const playerSearchQueryTimer = new Histogram({
    name: "search_player_query_duration_ms",
    help: "Duration of player search queries in ms",
    labelNames: ["prefixLength"],
    buckets: QueryBuckets
})
