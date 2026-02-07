import { expectOk } from "@/lib/test-utils"
import { describe, expect, test } from "bun:test"
import { dailyPlayerPopulationRoute } from "@/routes/metrics/dailyPlayerPopulation"

describe("player population 200", () => {
    test("it works", async () => {
        const result = await dailyPlayerPopulationRoute.$mock()

        expectOk(result)

        if (result.type === "err") {
            throw new Error("expected parsed response")
        } else {
            expect(result.parsed.length).toBeLessThanOrEqual(25)
        }
    })
})
