import { RaidHubRouter } from "@/core/RaidHubRouter"
import { blacklistInstanceRoute } from "./blacklist"
import { reportingStandingInstanceRoute } from "./instance-standing"
import { getPlayerStanding } from "./player-standing"
import { patchPlayer } from "./player"

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
            route: [getPlayerStanding, patchPlayer]
        }
    ]
})
