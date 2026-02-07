import { expectErr, expectOk } from "@/lib/test-utils"
import { describe, expect, test } from "bun:test"
import jwt from "jsonwebtoken"
import { adminAuthorizationRoute } from "@/routes/authorize/admin"

describe("authorize 200", () => {
    test("admin", async () => {
        const result = await adminAuthorizationRoute.$mock({
            body: {
                adminClientSecret: process.env.ADMIN_CLIENT_SECRET,
                bungieMembershipId: "1234567890"
            }
        })

        expectOk(result)

        if (result.type === "ok") {
            jwt.verify(result.parsed.value, process.env.JWT_SECRET!, (err, result) => {
                expect(err).toBeNull()
                expect(result).toMatchObject({
                    isAdmin: true,
                    bungieMembershipId: "1234567890",
                    destinyMembershipIds: []
                })
            })
        }
    })
})

describe("authorize 403", () => {
    test("bad key", async () => {
        const result = await adminAuthorizationRoute.$mock({
            body: {
                adminClientSecret: "35djfnsadf2933451241",
                bungieMembershipId: "1234567890"
            }
        })

        expectErr(result)
    })
})
