import { describe, test } from "bun:test"

import { pgReader } from "@/integrations/postgres"
import { expectErr, expectOk } from "@/lib/test-utils"

import { pgcrRoute } from "./pgcr"

describe("pgcr 200", () => {
    const t = async (instanceId: string) => {
        const result = await pgcrRoute.$mock({
            params: {
                instanceId
            }
        })

        expectOk(result)
    }

    test("returns pgcr for valid instance id", async () => {
        const existing = await pgReader.queryRow<{ instanceId: bigint }>(
            `SELECT instance_id AS "instanceId" FROM pgcr ORDER BY instance_id DESC LIMIT 1`
        )

        if (!existing) {
            return
        }

        await t(existing.instanceId.toString())
    })
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
