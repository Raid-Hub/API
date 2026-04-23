import { afterEach, describe, expect, test } from "bun:test"

import { generateJWT } from "./jwt"
import { authFromHeaders } from "./user-context"

describe("authFromHeaders", () => {
    const origSecret = process.env.JWT_SECRET

    afterEach(() => {
        process.env.JWT_SECRET = origSecret
    })

    test("returns undefined when Authorization is missing", () => {
        expect(authFromHeaders({})).toBeUndefined()
    })

    test("returns undefined for non-Bearer scheme", () => {
        expect(
            authFromHeaders({
                authorization: "Basic abc"
            })
        ).toBeUndefined()
    })

    test("returns undefined for invalid JWT", () => {
        process.env.JWT_SECRET = "test-secret"
        expect(
            authFromHeaders({
                authorization: "Bearer not-a-jwt"
            })
        ).toBeUndefined()
    })

    test("parses Bearer JWT into auth context", () => {
        process.env.JWT_SECRET = "test-secret"
        const token = generateJWT(
            {
                isAdmin: true,
                bungieMembershipId: "999",
                destinyMembershipIds: ["1", "2"]
            },
            600
        )
        const auth = authFromHeaders({
            authorization: `Bearer ${token}`
        })
        expect(auth).toEqual({
            isAdmin: true,
            bungieMembershipId: "999",
            destinyMembershipIds: ["1", "2"]
        })
    })

    test("uses first header value when authorization is an array", () => {
        process.env.JWT_SECRET = "test-secret"
        const token = generateJWT(
            {
                isAdmin: false,
                bungieMembershipId: "1",
                destinyMembershipIds: []
            },
            600
        )
        const auth = authFromHeaders({
            authorization: [`Bearer ${token}`, "ignored"]
        })
        expect(auth?.bungieMembershipId).toBe("1")
    })
})
