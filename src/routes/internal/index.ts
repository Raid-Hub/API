import { RaidHubRouter } from "@/core/RaidHubRouter"
import { subscriptionsRouter } from "@/routes/subscriptions"
import { queueDiscordLinkedRoleSyncRoute } from "./queue-discord-linked-role-sync"

/** Server-to-server and trusted clients: linked-role enqueue, subscription webhooks, etc. */
export const internalRouter = new RaidHubRouter({
    routes: [
        {
            path: "/queue-discord-linked-role-sync",
            route: queueDiscordLinkedRoleSyncRoute
        },
        {
            path: "/subscriptions",
            route: subscriptionsRouter
        }
    ]
})
