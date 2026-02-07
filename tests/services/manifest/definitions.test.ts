import { zActivityDefinition } from "@/schema/components/ActivityDefinition"
import { zFeatDefinition } from "@/schema/components/FeatDefinition"
import { zVersionDefinition } from "@/schema/components/VersionDefinition"
import { zNaturalNumber, zUInt32 } from "@/schema/output"
import { describe, expect, test } from "bun:test"
import { z } from "zod"
import {
    getActivityVersion,
    getRaidId,
    getVersionId,
    listActivityDefinitions,
    listFeatDefinitions,
    listHashes,
    listVersionDefinitions
} from "@/services/manifest/definitions"

describe("getRaidId", () => {
    test("returns the correct shape", async () => {
        const data = await getRaidId("vowofthedisciple").catch(console.error)

        const parsed = z.object({ id: zNaturalNumber() }).safeParse(data)
        if (!parsed.success) {
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})

describe("getVersionId", () => {
    test("returns the correct shape", async () => {
        const data = await getVersionId("normal").catch(console.error)

        const parsed = z.object({ id: zNaturalNumber() }).safeParse(data)
        if (!parsed.success) {
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})

describe("getActivityVersion", () => {
    test("returns the correct shape", async () => {
        const data = await getActivityVersion("crotasend", "master").catch(console.error)

        const parsed = z
            .object({ activityId: zNaturalNumber(), versionId: zNaturalNumber() })
            .safeParse(data)
        if (!parsed.success) {
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})

describe("listActivityDefinitions", () => {
    test("returns the correct shape", async () => {
        const data = await listActivityDefinitions().catch(console.error)

        const parsed = z.array(zActivityDefinition).safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(parsed.success).toBe(true)
        }
    })
})

describe("listVersionDefinitions", () => {
    test("returns the correct shape", async () => {
        const data = await listVersionDefinitions().catch(console.error)

        const parsed = z.array(zVersionDefinition).safeParse(data)
        if (!parsed.success) {
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(parsed.success).toBe(true)
        }
    })
})

describe("listHashes", () => {
    test("returns the correct shape", async () => {
        const data = await listHashes().catch(console.error)

        const parsed = z
            .array(
                z
                    .object({
                        hash: zUInt32(),
                        activityId: zNaturalNumber(),
                        versionId: zNaturalNumber()
                    })
                    .strict()
            )
            .safeParse(data)
        if (!parsed.success) {
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(parsed.success).toBe(true)
        }
    })
})

describe("listFeatDefinitions", () => {
    test("returns the correct shape", async () => {
        const data = await listFeatDefinitions().catch(console.error)

        const parsed = z.array(zFeatDefinition).safeParse(data)
        if (!parsed.success) {
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.data.length).toBeGreaterThan(0)
            expect(parsed.success).toBe(true)
        }
    })
})
