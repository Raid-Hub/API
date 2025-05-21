import { RaidHubRouter } from "@/core/RaidHubRouter"
import { blacklistInstanceRoute } from "./blacklist"
import { reportingStandingInstanceRoute } from "./instance-standing"

export const reportingRouter = new RaidHubRouter({
    routes: [
        {
            path: "/standing/:instanceId",
            route: reportingStandingInstanceRoute
        },
        {
            path: "/blacklist/:instanceId",
            route: blacklistInstanceRoute
        }
        // {
        //     path: "/cheat-level/:membershipId",
        //     route: reportingStandingInstanceRoute
        // }
    ]
})
