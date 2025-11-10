import { describe, test } from "bun:test"

import { expectErr, expectOk } from "@/lib/test-utils"

import { playerBasicRoute } from "./basic"

describe("player basic 200", () => {
    const t = async (membershipId: string) => {
        const result = await playerBasicRoute.$mock({ params: { membershipId } })

        expectOk(result)
    }

    test("returns basic info for valid player id", () => t("4611686018467831285"))
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
