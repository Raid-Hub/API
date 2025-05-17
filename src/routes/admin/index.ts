import { RaidHubRouter } from "@/RaidHubRouter"
import { adminProtected } from "@/middlewares/admin"
import { adminQueryRoute } from "./query"
import { reportingRouter } from "./reporting"

export const adminRouter = new RaidHubRouter({
    middlewares: [adminProtected],
    routes: [
        {
            path: "/query",
            route: adminQueryRoute
        },
        {
            path: "/reporting",
            route: reportingRouter
        }
    ]
})
