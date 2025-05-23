import { adminProtected } from "@/auth/admin"
import { RaidHubRouter } from "@/core/RaidHubRouter"
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
