import { RaidHubRouter } from "@/core/RaidHubRouter"
import { adminRouter } from "./admin"
import { adminAuthorizationRoute } from "./authorize/admin"
import { userAuthorizationRoute } from "./authorize/user"
import { clanStatsRoute } from "./clanStats"
import { instanceRoute } from "./instance"
import { leaderboardRouter } from "./leaderboard"
import { manifestRoute } from "./manifest"
import { metricsRouter } from "./metrics"
import { pgcrRoute } from "./pgcr"
import { playerRouter } from "./player"
import { statusRoute } from "./status"

export const router = new RaidHubRouter({
    routes: [
        {
            path: "/manifest",
            route: manifestRoute
        },
        {
            path: "/status",
            route: statusRoute
        },
        {
            path: "/player",
            route: playerRouter
        },
        {
            path: "/instance/:instanceId",
            route: instanceRoute
        },
        {
            path: "/activity/:instanceId",
            route: instanceRoute.deprecatedCopy()
        },
        {
            path: "/leaderboard",
            route: leaderboardRouter
        },
        {
            path: "/pgcr/:instanceId",
            route: pgcrRoute
        },
        {
            path: "/clan/:groupId",
            route: clanStatsRoute
        },
        {
            path: "/metrics",
            route: metricsRouter
        },
        {
            path: "/admin",
            route: adminRouter
        },
        {
            path: "/authorize/admin",
            route: adminAuthorizationRoute
        },
        {
            path: "/authorize/user",
            route: userAuthorizationRoute
        }
    ]
})
