import { Registry } from "prom-client"
import {
    activityHistoryQueryTimer,
    httpRequestTimer,
    playerProfileQueryTimer,
    playerSearchQueryTimer,
    postgresConnectionsGauge
} from "./metrics"

export const prometheusRegistry = new Registry()

prometheusRegistry.registerMetric(httpRequestTimer)
prometheusRegistry.registerMetric(activityHistoryQueryTimer)
prometheusRegistry.registerMetric(playerProfileQueryTimer)
prometheusRegistry.registerMetric(playerSearchQueryTimer)
prometheusRegistry.registerMetric(postgresConnectionsGauge)
