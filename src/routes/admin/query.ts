import { RaidHubRoute } from "@/core/RaidHubRoute"
import { pgReader } from "@/integrations/postgres"
import { TABLE_SCHEMAS } from "@/integrations/postgres/shared"
import { cacheControl } from "@/middleware/cache-control"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zNaturalNumber } from "@/schema/output"
import { DatabaseError } from "pg"
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
                    position: zNaturalNumber().optional(),
                    suggestions: z.array(z.string()).optional()
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
                const rows = await pgReader.queryRows<Record<string, unknown>>(wrappedQuery)
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

            const rows = await pgReader.queryRows<Record<string, unknown>>(wrappedQuery)

            return RaidHubRoute.ok({ data: rows, type: "SELECT" as const })
        } catch (err) {
            if (err instanceof DatabaseError) {
                // PostgreSQL error code 42P01 means "undefined_table" (relation does not exist)
                if (err.code === "42P01" && err.message) {
                    const missingTable = extractTableNameFromError(err.message)
                    if (missingTable) {
                        try {
                            const availableTables = await getAvailableTables()
                            const suggestions = findSimilarTableNames(missingTable, availableTables)
                            
                            return RaidHubRoute.fail(ErrorCode.AdminQuerySyntaxError, {
                                name: err.name,
                                code: err.code || undefined,
                                line: err.position ? String(err.position) : undefined,
                                position: err.position ? Number(err.position) : undefined,
                                suggestions: suggestions.length > 0 ? suggestions : undefined
                            })
                        } catch (suggestionError) {
                            // If we fail to get suggestions, just return the error without them
                        }
                    }
                }
                
                return RaidHubRoute.fail(ErrorCode.AdminQuerySyntaxError, {
                    name: err.name,
                    code: err.code || undefined,
                    line: err.position ? String(err.position) : undefined,
                    position: err.position ? Number(err.position) : undefined
                })
            } else {
                throw err
            }
        }
    }
})

async function explainQuery(query: string) {
    return await pgReader.queryRows<{ "QUERY PLAN": string }>(`EXPLAIN ${query}`)
}

async function getAvailableTables(): Promise<string[]> {
    const schemas = TABLE_SCHEMAS.map(s => `'${s}'`).join(",")
    const tables = await pgReader.queryRows<{ table_name: string }>(
        `SELECT table_name 
         FROM information_schema.tables 
         WHERE table_schema IN (${schemas})
         ORDER BY table_name`
    )
    return tables.map(t => t.table_name)
}

function calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1]
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1, // insertion
                    matrix[i - 1][j] + 1 // deletion
                )
            }
        }
    }

    return matrix[str2.length][str1.length]
}

function findSimilarTableNames(missingTable: string, availableTables: string[]): string[] {
    const tableLower = missingTable.toLowerCase()
    
    // Calculate similarity scores for all tables
    const scores = availableTables.map(table => {
        const tableLowerCase = table.toLowerCase()
        const distance = calculateLevenshteinDistance(tableLower, tableLowerCase)
        
        // Also check if the missing table is a substring or vice versa (for partial matches)
        const isSubstring = tableLowerCase.includes(tableLower) || tableLower.includes(tableLowerCase)
        
        return {
            table,
            distance,
            isSubstring
        }
    })
    
    // Sort by distance (lower is better), prioritizing substring matches
    scores.sort((a, b) => {
        if (a.isSubstring && !b.isSubstring) return -1
        if (!a.isSubstring && b.isSubstring) return 1
        return a.distance - b.distance
    })
    
    // Return top 5 suggestions with distance <= 5 or substring matches
    return scores
        .filter(s => s.distance <= 5 || s.isSubstring)
        .slice(0, 5)
        .map(s => s.table)
}

function extractTableNameFromError(errorMessage: string): string | null {
    // Match patterns like: relation "table_name" does not exist
    const match = errorMessage.match(/relation "([^"]+)" does not exist/)
    return match ? match[1] : null
}
