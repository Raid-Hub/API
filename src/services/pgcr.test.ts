import { pgReader } from "@/integrations/postgres"
import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { getRawCompressedPGCR } from "./pgcr"

describe("getRawCompressedPGCR", () => {
    test("returns the correct shape", async () => {
        const existing = await pgReader.queryRow<{ instanceId: bigint }>(
            `SELECT instance_id AS "instanceId" FROM pgcr ORDER BY instance_id DESC LIMIT 1`
        )
        if (!existing) {
            return
        }

        const data = await getRawCompressedPGCR(existing.instanceId.toString()).catch(console.error)

        const parsed = z
            .object({
                data: z.instanceof(Buffer)
            })
            .strict()
            .safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toEqual([])
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})
