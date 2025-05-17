import { zTeammate } from "@/schema/components/Teammate"
import { describe, expect, it } from "bun:test"
import { z } from "zod"
import { getTeammates } from "../teammates"

describe("getPlayer", () => {
    it("returns the correct shape", async () => {
        const data = await getTeammates("4611686018443649478", {
            count: 10
        }).catch(console.error)

        const parsed = z.array(zTeammate).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toHaveLength(0)
        } else {
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(parsed.success).toBe(true)
        }
    })
})
