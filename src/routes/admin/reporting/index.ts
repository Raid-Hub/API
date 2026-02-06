import { RaidHubRouter } from "@/core/RaidHubRouter"
import { blacklistInstanceRoute } from "./blacklist"
import { reportingStandingInstanceRoute } from "./instance-standing"
import { playerStandingRoute } from "./player-standing"
import { updatePlayerRoute } from "./player"

export const reportingRouter = new RaidHubRouter({
    routes: [
        {
            path: "/standing/:instanceId",
            route: reportingStandingInstanceRoute
        },
        {
            path: "/blacklist/:instanceId",
            route: blacklistInstanceRoute
        },
        {
            path: "/player/:membershipId",
            route: updatePlayerRoute
        },
        {
            path: "/player-standing/:membershipId",
            route: playerStandingRoute
        }
    ]
})
