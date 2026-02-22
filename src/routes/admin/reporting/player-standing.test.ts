import { expectErr, expectOk } from "@/lib/test-utils"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { describe, expect, test } from "bun:test"
import { getPlayerStanding } from "./player-standing"

describe("player standing 200", () => {
    const t = async (membershipId: string) => {
        const result = await getPlayerStanding.$mock({ params: { membershipId } })

        expectOk(result)
    }

    test("normal", () => t("4611686018488107374"))
})

describe("player standing not found", () => {
    const t = async (membershipId: string) => {
        const result = await getPlayerStanding.$mock({
            params: {
                membershipId
            }
        })

        expectErr(result)
        if (result.type === "err") {
            expect(result.code).toBe(ErrorCode.PlayerNotFoundError)
        }
    }

    test("fake id", () => t("1111111111111111111"))
})
