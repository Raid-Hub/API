import { expectErr, expectOk } from "@/test"
import { generateJWT } from "@/utils/auth"
import { describe, test } from "bun:test"
import { playerProfileRoute } from "./profile"

describe("player profile 200", () => {
    const t = async (membershipId: string) => {
        const result = await playerProfileRoute.$mock({ params: { membershipId } })
        expectOk(result)
    }

    test("4611686018488107374", () => t("4611686018488107374"))

    test("no clears", () => t("4611686018497002892"))
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

    test("1", () => t("1"))
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

    test("4611686018467346804", () => t("4611686018467346804"))
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
