import { RaidHubRouter } from "@/core/RaidHubRouter"
import { clanStatsRoute } from "../clanStats"
import { clanBasicRoute } from "./basic"

export const clanGroupRouter = new RaidHubRouter({
    routes: [
        { path: "/", route: clanStatsRoute },
        { path: "/basic", route: clanBasicRoute }
    ]
})
