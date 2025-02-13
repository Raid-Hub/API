import { describe, expect, test } from "bun:test"
import jwt from "jsonwebtoken"
import { expectErr, expectOk } from "../../util.test"
import { userAuthorizationRoute } from "./user"

describe("authorize 200", () => {
    test("user", async () => {
        const result = await userAuthorizationRoute.$mock({
            body: {
                clientSecret: process.env.CLIENT_SECRET,
                bungieMembershipId: "1234567890",
                destinyMembershipIds: ["4611686018467346804", "4611686018488107374"]
            }
        })

        expectOk(result)

        if (result.type === "ok") {
            jwt.verify(result.parsed.value, process.env.JWT_SECRET!, (err, result) => {
                expect(err).toBeNull()
                expect(result).toMatchObject({
                    isAdmin: false,
                    bungieMembershipId: "1234567890",
                    destinyMembershipIds: ["4611686018467346804", "4611686018488107374"]
                })
            })
        }
    })
})

describe("authorize 403", () => {
    test("bad key", async () => {
        const result = await userAuthorizationRoute.$mock({
            body: {
                clientSecret: "35djfnsadf2933451241",
                bungieMembershipId: "1234567890",
                destinyMembershipIds: ["4611686018467346804", "4611686018488107374"]
            }
        })

        expectErr(result)
    })
})
