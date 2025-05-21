import { zPlayerInfo } from "@/schema/components/PlayerInfo"
import { describe, expect, it } from "bun:test"
import { z } from "zod"
import { searchForPlayer } from "./player-search"

describe("searchForPlayer", () => {
    it("returns the correct shape", async () => {
        const data = await searchForPlayer("Newo", {
            count: 10,
            global: true
        }).catch(console.error)

        const parsed = z
            .object({
                searchTerm: z.literal("newo"),
                results: z.array(zPlayerInfo)
            })
            .strict()
            .safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toHaveLength(0)
        } else {
            expect(parsed.data.results.length).toBeGreaterThan(0)
            expect(parsed.success).toBe(true)
        }
    })

    it("returns the correct shape with platform", async () => {
        const data = await searchForPlayer(" Newo", {
            count: 10,
            global: false,
            membershipType: 2
        }).catch(console.error)

        const parsed = z
            .object({
                searchTerm: z.literal("newo"),
                results: z.array(zPlayerInfo)
            })
            .strict()
            .safeParse(data)
        if (!parsed.success) {
            expect(parsed.error.errors).toHaveLength(0)
        } else {
            expect(parsed.data.results.length).toBeGreaterThan(0)
            expect(parsed.success).toBe(true)
        }
    })
})
