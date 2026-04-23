import { afterAll, beforeAll, describe, test } from "bun:test"

import { getFixturePool } from "@/lib/test-fixture-db"
import { gzipPgcrJson } from "@/lib/test-minimal-pgcr"
import { expectErr, expectOk } from "@/lib/test-utils"

import { pgcrRoute } from "./pgcr"

const fixtureDb = getFixturePool()
const fixturePgcrInstanceId = "999000000702"

beforeAll(async () => {
    await fixtureDb.query(`DELETE FROM raw.pgcr WHERE instance_id = $1::bigint`, [
        fixturePgcrInstanceId
    ])
    await fixtureDb.query(
        `INSERT INTO raw.pgcr (instance_id, data, date_crawled) VALUES ($1::bigint, $2, NOW())`,
        [fixturePgcrInstanceId, gzipPgcrJson(fixturePgcrInstanceId)]
    )
})

afterAll(async () => {
    await fixtureDb.query(`DELETE FROM raw.pgcr WHERE instance_id = $1::bigint`, [
        fixturePgcrInstanceId
    ])
})

describe("pgcr 200", () => {
    const t = async (instanceId: string) => {
        const result = await pgcrRoute.$mock({
            params: {
                instanceId
            }
        })

        expectOk(result)
    }

    test("returns pgcr for valid instance id", () => t(fixturePgcrInstanceId))
})

describe("pgcr 404", () => {
    const t = async (instanceId: string) => {
        const result = await pgcrRoute.$mock({
            params: {
                instanceId
            }
        })

        expectErr(result)
    }

    test("returns 404 for invalid instance id", () => t("1"))
})
