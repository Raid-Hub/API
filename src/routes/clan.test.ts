import { describe, test } from "bun:test"
import { clanStatsRoute } from "./clan"
import { expectErr, expectOk } from "./testUtil"

describe("clan 200", () => {
    const t = async (groupId: string) => {
        const result = await clanStatsRoute.$mock({ params: { groupId } })

        expectOk(result)
    }

    test("Elysium", () => t("3148408"))

    test("Passion", () => t("4999487"))
})

describe("clan 404", () => {
    const t = async (groupId: string) => {
        const result = await clanStatsRoute.$mock({
            params: {
                groupId
            }
        })

        expectErr(result)
    }

    test("1", () => t("1"))
})
