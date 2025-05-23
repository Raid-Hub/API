import { RaidHubRoute } from "@/core/RaidHubRoute"
import { postgres } from "@/integrations/postgres"
import { cacheControl } from "@/middleware/cache-control"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zNaturalNumber } from "@/schema/util"
import { DatabaseError } from "postgresql-client"
import { z } from "zod"

export const adminQueryRoute = new RaidHubRoute({
    isAdministratorRoute: true,
    description: "Run a query against the database",
    method: "post",
    body: z.object({
        query: z.string(),
        type: z.enum(["SELECT", "EXPLAIN"]),
        ignoreCost: z.boolean().default(false)
    }),

    response: {
        success: {
            statusCode: 200,
            schema: z.discriminatedUnion("type", [
                z.object({
                    type: z.literal("SELECT"),
                    data: z.array(z.record(z.unknown()))
                }),
                z.object({
                    type: z.literal("HIGH COST"),
                    data: z.null(),
                    cost: z.number(),
                    estimatedDuration: z.number()
                }),
                z.object({
                    type: z.literal("EXPLAIN"),
                    data: z.array(z.string())
                })
            ])
        },
        errors: [
            {
                code: ErrorCode.AdminQuerySyntaxError,
                statusCode: 501,
                schema: z.object({
                    name: z.string(),
                    code: z.string().optional(),
                    line: z.string().optional(),
                    position: zNaturalNumber().optional()
                })
            }
        ]
    },
    middleware: [cacheControl(5)],
    async handler(req) {
        try {
            if (req.body.type === "EXPLAIN") {
                const explained = await explainQuery(req.body.query)
                return RaidHubRoute.ok({
                    data: explained.map(r => r["QUERY PLAN"]),
                    type: "EXPLAIN" as const
                })
            }

            // Wrap the query in a subquery to limit the number of rows returned
            // This is not a security measure, but rather a way to prevent the server from
            // returning too much data at once. The client is trusted to not abuse this, but
            // the server will still enforce the limit to prevent mistakes.
            const wrappedQuery = `SELECT * FROM (${req.body.query.replace(
                ";",
                ""
            )}) AS __foo__ LIMIT 50`

            if (req.body.ignoreCost) {
                const rows = await postgres.queryRows<Record<string, unknown>>(wrappedQuery)
                return RaidHubRoute.ok({ data: rows, type: "SELECT" as const })
            }

            const explained = await explainQuery(wrappedQuery)
            const costString = explained[0]["QUERY PLAN"]
                .split(" ")
                .find(s => s.startsWith("(cost="))!
            const minCostString = costString.substring(
                costString.indexOf("=") + 1,
                costString.indexOf("..")
            )
            const maxCostString = costString.substring(costString.indexOf("..") + 2)
            const minCost = parseFloat(minCostString)
            const maxCost = parseFloat(maxCostString)

            if (maxCost > 1_000_000) {
                return RaidHubRoute.ok({
                    data: null,
                    type: "HIGH COST" as const,
                    cost: maxCost,
                    estimatedDuration: (minCost + maxCost) / 2 / 100_000
                })
            }

            const rows = await postgres.queryRows<Record<string, unknown>>(wrappedQuery)

            return RaidHubRoute.ok({ data: rows, type: "SELECT" as const })
        } catch (err) {
            if (err instanceof DatabaseError) {
                return RaidHubRoute.fail(ErrorCode.AdminQuerySyntaxError, {
                    name: err.name,
                    code: err.code,
                    line: err.line,
                    position: err.position
                })
            } else {
                throw err
            }
        }
    }
})

async function explainQuery(query: string) {
    return await postgres.queryRows<{ "QUERY PLAN": string }>(`EXPLAIN ${query}`)
}
