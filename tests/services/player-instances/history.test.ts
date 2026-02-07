import { zInstanceForPlayer } from "@/schema/components/InstanceForPlayer"
import { getInstancePlayerInfo } from "@/services/instance/instance"
import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { getActivities } from "@/services/player-instances/history"

describe("getActivities", () => {
    test("returns the correct shape", async () => {
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

    test("returns the correct shape w/ a cutoff", async () => {
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

    test("whitelisted instance is not blacklisted", async () => {
        const players = await getInstancePlayerInfo("16707634209").catch(console.error)
        if (!players || players.length === 0) {
            console.error("No players found for instance 16707634209")
            return
        }

        const membershipId = players[0].membershipId.toString()
        const data = await getActivities(membershipId, {
            count: 100
        }).catch(console.error)

        const parsed = z.array(zInstanceForPlayer).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            const instance = parsed.data.find(i => i.instanceId === 16707634209n)
            if (instance) {
                expect(instance.isBlacklisted).toBe(false)
            }
            expect(parsed.success).toBe(true)
        }
    })
})
