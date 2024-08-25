import { describe, test } from "bun:test"
import { expectErr, expectOk } from "../../../util.test"
import { playerBasicRoute } from "./basic"

describe("player basic 200", () => {
    const t = async (membershipId: string) => {
        const result = await playerBasicRoute.$mock({ params: { membershipId } })

        expectOk(result)
    }

    test("4611686018467831285", () => t("4611686018467831285"))
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

    test("1", () => t("1"))
})
