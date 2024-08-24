import { describe, test } from "bun:test"
import { generateJWT } from "../../../util/auth"
import { expectErr, expectOk } from "../../testUtil"
import { playerTeammatesRoute } from "./teammates"

describe("teammates 200", () => {
    const t = async (membershipId: string) => {
        const result = await playerTeammatesRoute.$mock({ params: { membershipId } })

        expectOk(result)
    }

    test("4611686018443649478", () => t("4611686018443649478"))
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

    test("4611686018467346804", () => t("4611686018467346804"))
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

    test("1", () => t("1"))
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
