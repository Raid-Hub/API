import { RaidHubRouter } from "@/RaidHubRouter"
import { dailyPlayerPopulationRoute } from "./dailyPlayerPopulation"
import { weaponsRollingWeekRoute } from "./weaponsRollingWeek"

export const metricsRouter = new RaidHubRouter({
    routes: [
        { path: "/weapons/rolling-week", route: weaponsRollingWeekRoute },
        {
            path: "/population/rolling-day",
            route: dailyPlayerPopulationRoute
        }
    ]
})
