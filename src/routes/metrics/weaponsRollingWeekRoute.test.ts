import { expectOk } from "@/test"
import { describe, expect, test } from "bun:test"
import { weaponsRollingWeekRoute } from "./weaponsRollingWeek"

describe("weekly weapon meta 200", () => {
    const t = async (query: unknown) => {
        const result = await weaponsRollingWeekRoute.$mock({ query })

        expectOk(result)

        if (result.type === "err") {
            throw new Error("expected parsed response")
        } else {
            return result.parsed
        }
    }

    test("kills", async () => {
        const data = await t({
            sort: "kills"
        })

        expect(data.energy.length).toBe(25)
        expect(data.kinetic.length).toBe(25)
        expect(data.power.length).toBe(25)
    })

    test("usage", async () => {
        const data = await t({
            sort: "usage"
        })

        expect(data.energy.length).toBe(25)
        expect(data.kinetic.length).toBe(25)
        expect(data.power.length).toBe(25)
    })
})
