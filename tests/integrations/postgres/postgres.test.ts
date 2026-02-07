import { describe, expect, test } from "bun:test"

import { pgReader } from "@/integrations/postgres"

describe("postgres timestamptz normalization", () => {
    test("plain timestamptz columns hydrate as UTC dates", async () => {
        const row = await pgReader.queryRow<{ plain: Date }>("SELECT NOW() AS plain")

        expect(row).not.toBeNull()
        expect(row!.plain).toBeInstanceOf(Date)
        expect(row!.plain.toISOString().endsWith("Z")).toBe(true)
        expect(Math.abs(Date.now() - row!.plain.getTime())).toBeLessThan(500)
    })

    test("timestamptz embedded in jsonb returns UTC ISO 8601 strings", async () => {
        const row = await pgReader.queryRow<{ payload: { ts: string } }>(
            "SELECT jsonb_build_object('ts', NOW()) AS payload"
        )

        expect(row).not.toBeNull()
        expect(typeof row!.payload.ts).toBe("string")
        expect(row!.payload.ts).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|\+00:00)$/
        )
        expect(new Date(row!.payload.ts).toISOString().endsWith("Z")).toBe(true)
        expect(Math.abs(Date.now() - new Date(row!.payload.ts).getTime())).toBeLessThan(500)
    })
})
