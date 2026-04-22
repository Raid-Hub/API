import { describe, test } from "bun:test"

import { pgReader } from "@/integrations/postgres"
import { expectErr, expectOk } from "@/lib/test-utils"

import { playerBasicRoute } from "./basic"

describe("player basic 200", () => {
    const t = async (membershipId: string) => {
        const result = await playerBasicRoute.$mock({ params: { membershipId } })

        expectOk(result)
    }

    test("returns basic info for valid player id", async () => {
        const existing = await pgReader.queryRow<{ membershipId: bigint }>(
            `SELECT membership_id AS "membershipId" FROM player ORDER BY membership_id DESC LIMIT 1`
        )
        if (!existing) {
            return
        }

        await t(existing.membershipId.toString())
    })
})

describe("player basic 404", () => {
    const t = async (membershipId: string) => {
        const result = await playerBasicRoute.$mock({
            params: {
                membershipId
            }
        })

        expectErr(result)
    }

    test("returns 404 for invalid player id", () => t("1"))
})
