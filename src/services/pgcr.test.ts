import { getFixturePool } from "@/lib/test-fixture-db"
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { z } from "zod"
import { getRawCompressedPGCR } from "./pgcr"

const fixtureDb = getFixturePool()
const fixturePgcrInstanceId = "999000000703"

beforeAll(async () => {
    await fixtureDb.query(`DELETE FROM raw.pgcr WHERE instance_id = $1::bigint`, [
        fixturePgcrInstanceId
    ])
    await fixtureDb.query(
        `INSERT INTO raw.pgcr (instance_id, data, date_crawled) VALUES ($1::bigint, $2, NOW())`,
        [fixturePgcrInstanceId, Buffer.from("{}")]
    )
})

afterAll(async () => {
    await fixtureDb.query(`DELETE FROM raw.pgcr WHERE instance_id = $1::bigint`, [
        fixturePgcrInstanceId
    ])
})

describe("getRawCompressedPGCR", () => {
    test("returns the correct shape", async () => {
        const data = await getRawCompressedPGCR(fixturePgcrInstanceId).catch(console.error)

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
