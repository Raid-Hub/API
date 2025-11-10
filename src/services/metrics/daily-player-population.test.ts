import { zPopulationByRaidMetric } from "@/schema/components/Metrics"
import { zISO8601DateString as zISODateString } from "@/schema/output"
import { getDailyPlayerPopulation } from "@/services/metrics/daily-player-population"
import { describe, expect, test } from "bun:test"
import { z } from "zod"

describe("getDailyPlayerPopulation", () => {
    test("returns the correct shape", async () => {
        const data = await getDailyPlayerPopulation()

        const parsed = z
            .array(
                z.object({
                    hour: zISODateString(),
                    population: zPopulationByRaidMetric
                })
            )
            .safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})
