import { describe, expect, test } from "bun:test"
import { expectOk } from "../../util.test"
import { dailyPlayerPopulationRoute } from "./dailyPlayerPopulation"

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
