import { RaidHubRouter } from "@/core/RaidHubRouter"
import {
    deleteDiscordWebhookRoute,
    getDiscordWebhookStatusRoute,
    putDiscordWebhookRoute
} from "./webhooks"

export const subscriptionsDiscordRouter = new RaidHubRouter({
    routes: [
        {
            path: "/webhooks",
            route: getDiscordWebhookStatusRoute
        },
        {
            path: "/webhooks",
            route: putDiscordWebhookRoute
        },
        {
            path: "/webhooks",
            route: deleteDiscordWebhookRoute
        }
    ]
})
