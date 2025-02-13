import { RaidHubRouter } from "../../RaidHubRouter"
import { playerActivitiesRoute } from "./membershipId/activities"
import { playerBasicRoute } from "./membershipId/basic"
import { playerInstancesRoute } from "./membershipId/instances"
import { playerProfileRoute } from "./membershipId/profile"
import { playerTeammatesRoute } from "./membershipId/teammates"
import { playerSearchRoute } from "./search"

export const playerRouter = new RaidHubRouter({
    routes: [
        { path: "/search", route: playerSearchRoute },
        {
            path: "/:membershipId",
            route: new RaidHubRouter({
                routes: [
                    {
                        path: "/activities",
                        route: playerActivitiesRoute
                    },
                    {
                        path: "/basic",
                        route: playerBasicRoute
                    },
                    {
                        path: "/profile",
                        route: playerProfileRoute
                    },
                    {
                        path: "/teammates",
                        route: playerTeammatesRoute
                    },
                    {
                        path: "/instances",
                        route: playerInstancesRoute
                    }
                ]
            })
        }
    ]
})
