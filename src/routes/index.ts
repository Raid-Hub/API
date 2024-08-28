import { RaidHubRouter } from "../RaidHubRouter"
import { activityRoute } from "./activity"
import { adminRouter } from "./admin"
import { adminAuthorizationRoute } from "./authorize/admin"
import { userAuthorizationRoute } from "./authorize/user"
import { clanStatsRoute } from "./clanStats"
import { leaderboardRouter } from "./leaderboard"
import { manifestRoute } from "./manifest"
import { metricsRouter } from "./metrics"
import { pgcrRoute } from "./pgcr"
import { playerRouter } from "./player"

export const router = new RaidHubRouter({
    routes: [
        {
            path: "/manifest",
            route: manifestRoute
        },
        {
            path: "/player",
            route: playerRouter
        },
        {
            path: "/activity/:instanceId",
            route: activityRoute
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
