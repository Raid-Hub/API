import { expectErr, expectOk } from "@/test"
import { describe, test } from "bun:test"
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

    test("13478946450", () => t("13478946450"))
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

    test("1", () => t("1"))
})
