import { zInstanceForPlayer } from "@/schema/components/InstanceForPlayer"
import { describe, expect, it } from "bun:test"
import { z } from "zod"
import { getActivities } from "./history"

describe("getActivities", () => {
    it("returns the correct shape", async () => {
        const data = await getActivities("4611686018488107374", {
            count: 5,
            cursor: new Date("2023-09-01T17:00:00Z")
        }).catch(console.error)

        const parsed = z.array(zInstanceForPlayer).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(parsed.success).toBe(true)
        }
    })

    it("returns the correct shape w/ a cutoff", async () => {
        const data = await getActivities("4611686018488107374", {
            count: 7,
            cutoff: new Date("2023-09-01T17:00:00Z")
        }).catch(console.error)

        const parsed = z.array(zInstanceForPlayer).safeParse(data)
        if (!parsed.success) {
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(parsed.success).toBe(true)
        }
    })
})
