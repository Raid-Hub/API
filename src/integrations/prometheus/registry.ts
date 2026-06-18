import { Registry } from "prom-client"
import {
    activityHistoryQueryTimer,
    discordLrPublishTotal,
    httpRequestCountByRegion,
    httpRequestTimer,
    playerProfileQueryTimer,
    playerSearchQueryTimer,
    postgresConnectionsGauge
} from "./metrics"

export const prometheusRegistry = new Registry()

prometheusRegistry.registerMetric(httpRequestTimer)
prometheusRegistry.registerMetric(httpRequestCountByRegion)
prometheusRegistry.registerMetric(activityHistoryQueryTimer)
prometheusRegistry.registerMetric(playerProfileQueryTimer)
prometheusRegistry.registerMetric(playerSearchQueryTimer)
prometheusRegistry.registerMetric(postgresConnectionsGauge)
prometheusRegistry.registerMetric(discordLrPublishTotal)
