import { zPlayerInfo } from "@/schema/components/PlayerInfo"
import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { searchForPlayer } from "@/services/search/player-search"

describe("searchForPlayer", () => {
    test("returns the correct shape", async () => {
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
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.data.results.length).toBeGreaterThan(0)
            expect(parsed.success).toBe(true)
        }
    })

    test("returns the correct shape with platform", async () => {
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
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.data.results.length).toBeGreaterThan(0)
            expect(parsed.success).toBe(true)
        }
    })
})
