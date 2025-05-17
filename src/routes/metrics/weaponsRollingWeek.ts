import { RaidHubRoute } from "@/RaidHubRoute"
import { getRollingWeaponMeta } from "@/data/metrics/rolling-weapon-meta"
import { cacheControl } from "@/middlewares/cache-control"
import { zWeaponMetric } from "@/schema/components/Metrics"
import { z } from "zod"

export const weaponsRollingWeekRoute = new RaidHubRoute({
    method: "get",
    description: "Wet the top weapons in each slot over the past 168 hours (7 days)",
    query: z.object({
        sort: z.enum(["usage", "kills"]).optional().default("usage"),
        count: z.coerce.number().int().nonnegative().max(100).default(25).openapi({
            description: "The number of weapons to return per slot"
        })
    }),
    response: {
        success: {
            statusCode: 200,
            schema: z.object({
                energy: z.array(zWeaponMetric),
                kinetic: z.array(zWeaponMetric),
                power: z.array(zWeaponMetric)
            })
        }
    },
    middleware: [cacheControl(5)],
    handler: async ({ query }) => {
        const data = await getRollingWeaponMeta(query)

        return RaidHubRoute.ok(data)
    }
})
