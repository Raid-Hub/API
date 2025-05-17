import { RaidHubRouter } from "../../../RaidHubRouter"
import { reportingStandingInstanceRoute } from "./instance-standing"

export const reportingRouter = new RaidHubRouter({
    routes: [
        {
            path: "/standing/:instanceId",
            route: reportingStandingInstanceRoute
        }
    ]
})
