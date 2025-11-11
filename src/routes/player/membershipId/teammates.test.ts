import { describe, test } from "bun:test"

import { generateJWT } from "@/auth/jwt"
import { expectErr, expectOk } from "@/lib/test-utils"

import { playerTeammatesRoute } from "./teammates"

describe("teammates 200", () => {
    const t = async (membershipId: string) => {
        const result = await playerTeammatesRoute.$mock({ params: { membershipId } })

        expectOk(result)
    }

    test("returns teammates for valid player id", () => t("4611686018443649478"))
})

describe("teammates 403", () => {
    const t = async (membershipId: string) => {
        const result = await playerTeammatesRoute.$mock({
            params: {
                membershipId
            }
        })

        expectErr(result)
    }

    test("returns 403 for private profile", () => t("4611686018467346804"))
})

describe("teammates 404", () => {
    const t = async (membershipId: string) => {
        const result = await playerTeammatesRoute.$mock({
            params: {
                membershipId
            }
        })

        expectErr(result)
    }

    test("returns 404 for invalid player id", () => t("1"))
})

describe("teammates authorized", () => {
    const token = generateJWT(
        {
            isAdmin: false,
            bungieMembershipId: "123",
            destinyMembershipIds: ["4611686018467346804"]
        },
        600
    )

    playerTeammatesRoute
        .$mock({
            params: {
                membershipId: "4611686018467346804"
            },
            headers: {
                authorization: `Bearer ${token}`
            }
        })
        .then(result => expectOk(result))
})
