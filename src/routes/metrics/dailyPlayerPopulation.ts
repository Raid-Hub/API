import { RaidHubRoute } from "@/core/RaidHubRoute"
import { cacheControl } from "@/middleware/cache-control"
import { zPopulationByRaidMetric } from "@/schema/components/Metrics"
import { zISO8601DateString } from "@/schema/output"
import { getDailyPlayerPopulation } from "@/services/metrics/daily-player-population"
import { z } from "zod"

export const dailyPlayerPopulationRoute = new RaidHubRoute({
    method: "get",
    description: "Get the daily player population by raid",
    response: {
        success: {
            statusCode: 200,
            schema: z.array(
                z.object({
                    hour: zISO8601DateString(),
                    population: zPopulationByRaidMetric
                })
            )
        }
    },
    middleware: [cacheControl(5)],
    handler: async () => {
        const data = await getDailyPlayerPopulation()
        return RaidHubRoute.ok(data)
    }
})
