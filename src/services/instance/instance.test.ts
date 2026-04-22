import { pgReader } from "@/integrations/postgres"
import { zInstance } from "@/schema/components/Instance"
import { zInstanceExtended } from "@/schema/components/InstanceExtended"
import { zInstanceMetadata } from "@/schema/components/InstanceMetadata"
import { describe, expect, test } from "bun:test"
import { z } from "zod"
import {
    getInstance,
    getInstanceExtended,
    getInstanceMetadataByHash,
    getLeaderboardEntryForInstance
} from "./instance"

describe("getInstance", () => {
    test("returns the correct shape", async () => {
        const existing = await pgReader.queryRow<{ instanceId: bigint }>(
            `SELECT instance_id AS "instanceId" FROM instance ORDER BY instance_id DESC LIMIT 1`
        )
        if (!existing) {
            return
        }

        const data = await getInstance(existing.instanceId.toString()).catch(console.error)

        const parsed = zInstance.safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
    describe("edge cases", () => {
        test("computed flags are booleans", async () => {
            const existing = await pgReader.queryRow<{ instanceId: bigint }>(
                `SELECT instance_id AS "instanceId" FROM instance ORDER BY instance_id DESC LIMIT 1`
            )
            if (!existing) {
                return
            }

            const data = await getInstance(existing.instanceId.toString()).catch(console.error)
            const parsed = zInstance.safeParse(data)
            if (!parsed.success) {
                console.error(parsed.error.errors)
                expect(parsed.error.errors).toEqual([])
            } else {
                expect(typeof parsed.data.isContest).toBe("boolean")
                expect(typeof parsed.data.isDayOne).toBe("boolean")
                expect(typeof parsed.data.isWeekOne).toBe("boolean")
                expect(typeof parsed.data.isBlacklisted).toBe("boolean")
            }
        })
    })
})

describe("getInstanceExtended", () => {
    test("returns the correct shape", async () => {
        const existing = await pgReader.queryRow<{ instanceId: bigint }>(
            `SELECT instance_id AS "instanceId" FROM instance ORDER BY instance_id DESC LIMIT 1`
        )
        if (!existing) {
            return
        }

        const data = await getInstanceExtended(existing.instanceId.toString()).catch(console.error)

        const parsed = zInstanceExtended.safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})

describe("getInstanceMetadataByHash", () => {
    test("returns the correct shape", async () => {
        const existing = await pgReader.queryRow<{ hash: string }>(
            `SELECT hash::text AS "hash" FROM activity_version ORDER BY hash DESC LIMIT 1`
        )
        if (!existing) {
            return
        }

        const data = await getInstanceMetadataByHash(existing.hash).catch(console.error)

        const parsed = zInstanceMetadata.safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})

describe("getLeaderboardEntryForInstance", () => {
    test("returns the correct shape", async () => {
        const existing = await pgReader.queryRow<{ instanceId: bigint }>(
            `SELECT instance_id AS "instanceId" FROM instance ORDER BY instance_id DESC LIMIT 1`
        )
        if (!existing) {
            return
        }

        const data = await getLeaderboardEntryForInstance(existing.instanceId.toString()).catch(
            console.error
        )

        const parsed = z
            .object({
                rank: z.number().int()
            })
            .nullable()
            .safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})
