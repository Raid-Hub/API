import { RaidHubRouter } from "@/core/RaidHubRouter"
import { subscriptionsDiscordRouter } from "./discord"

export const subscriptionsRouter = new RaidHubRouter({
    routes: [
        {
            path: "/discord",
            route: subscriptionsDiscordRouter
        }
    ]
})
