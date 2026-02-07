import { describe, test } from "bun:test"

import { generateJWT } from "@/auth/jwt"
import { expectErr, expectOk } from "@/lib/test-utils"

import { playerProfileRoute } from "@/routes/player/membershipId/profile"

describe("player profile 200", () => {
    const t = async (membershipId: string) => {
        const result = await playerProfileRoute.$mock({ params: { membershipId } })
        expectOk(result)
    }

    test("returns profile for valid player id", () => t("4611686018488107374"))

    test("returns profile for player with no clears", () => t("4611686018497002892"))
})

describe("player profile 404", () => {
    const t = async (membershipId: string) => {
        const result = await playerProfileRoute.$mock({
            params: {
                membershipId
            }
        })

        expectErr(result)
    }

    test("returns 404 for invalid player id", () => t("1"))
})

describe("player profile 403", () => {
    const t = async (membershipId: string) => {
        const result = await playerProfileRoute.$mock({
            params: {
                membershipId
            }
        })

        expectErr(result)
    }

    test("returns 403 for private profile without authorization", () => t("4611686018467346804"))
})

describe("player profile authorized", () => {
    const token = generateJWT(
        {
            isAdmin: false,
            bungieMembershipId: "123",
            destinyMembershipIds: ["4611686018467346804"]
        },
        600
    )

    playerProfileRoute
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
