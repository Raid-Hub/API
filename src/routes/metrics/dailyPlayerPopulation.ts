import { z } from "zod"
import { RaidHubRoute } from "../../RaidHubRoute"
import { getDailyPlayerPopulation } from "../../data/metrics/daily-player-population"
import { zPopulationByRaidMetric } from "../../schema/components/Metrics"
import { zISODateString } from "../../schema/util"

export const dailyPlayerPopulationRoute = new RaidHubRoute({
    method: "get",
    description: "Get the daily player population by raid",
    response: {
        success: {
            statusCode: 200,
            schema: z.array(
                z.object({
                    hour: zISODateString(),
                    population: zPopulationByRaidMetric
                })
            )
        }
    },
    handler: async () => {
        const data = await getDailyPlayerPopulation()
        return RaidHubRoute.ok(data)
    }
})