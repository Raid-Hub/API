import { zPlayerInfo } from "@/schema/components/PlayerInfo"
import {
    zPlayerProfileActivityStats,
    zPlayerProfileGlobalStats,
    zWorldFirstEntry
} from "@/schema/components/PlayerProfile"
import { describe, expect, it } from "bun:test"
import { z } from "zod"
import {
    getPlayer,
    getPlayerActivityStats,
    getPlayerGlobalStats,
    getWorldFirstEntries
} from "./player"

describe("getPlayer", () => {
    it("returns the correct shape", async () => {
        const data = await getPlayer("4611686018488107374").catch(console.error)

        const parsed = zPlayerInfo.safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})

describe("getPlayerActivityStats", () => {
    it("returns the correct shape", async () => {
        const data = await getPlayerActivityStats("4611686018488107374").catch(console.error)

        const parsed = z.array(zPlayerProfileActivityStats).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(parsed.success).toBe(true)
        }
    })
})

describe("getPlayerGlobalStats", () => {
    it("returns the correct shape", async () => {
        const data = await getPlayerGlobalStats("4611686018488107374").catch(console.error)

        const parsed = zPlayerProfileGlobalStats.safeParse(data)
        if (!parsed.success) {
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })

    it("returns the correct shape for a private profile", async () => {
        const data = await getPlayerGlobalStats("4611686018467346804").catch(console.error)

        const parsed = zPlayerProfileGlobalStats.safeParse(data)
        if (!parsed.success) {
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})

describe("getWorldFirstEntries", () => {
    it("returns the correct shape", async () => {
        const data = await getWorldFirstEntries("4611686018488107374").catch(console.error)

        const parsed = z.array(zWorldFirstEntry).safeParse(data)
        if (!parsed.success) {
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(parsed.success).toBe(true)
        }
    })
})
