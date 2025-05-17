import { getRollingWeaponMeta } from "@/data/metrics/rolling-weapon-meta"
import { zWeaponMetric } from "@/schema/components/Metrics"
import { describe, expect, it } from "bun:test"
import { z } from "zod"

describe("getRollingWeaponMeta", () => {
    it("returns the correct shape", async () => {
        const data = await getRollingWeaponMeta({
            sort: "usage",
            count: 10
        })

        const parsed = z
            .object({
                kinetic: z.array(zWeaponMetric),
                energy: z.array(zWeaponMetric),
                power: z.array(zWeaponMetric)
            })
            .safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toHaveLength(0)
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})
