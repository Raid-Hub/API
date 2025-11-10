import { describe, test } from "bun:test"

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

    test("returns pgcr for valid instance id", () => t("13478946450"))
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
