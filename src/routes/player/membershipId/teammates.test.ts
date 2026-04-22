import { describe, test } from "bun:test"

import { generateJWT } from "@/auth/jwt"
import { pgReader } from "@/integrations/postgres"
import { expectErr, expectOk } from "@/lib/test-utils"

import { playerTeammatesRoute } from "./teammates"

describe("teammates 200", () => {
    const t = async () => {
        const existing = await pgReader.queryRow<{ membershipId: bigint }>(
            `SELECT membership_id AS "membershipId" FROM player ORDER BY membership_id DESC LIMIT 1`
        )
        if (!existing) {
            return
        }

        const result = await playerTeammatesRoute.$mock({
            params: { membershipId: existing.membershipId.toString() }
        })

        expectOk(result)
    }

    test("returns teammates for valid player id", () => t())
})

describe("teammates 403", () => {
    const t = async () => {
        const privatePlayer = await pgReader.queryRow<{ membershipId: bigint }>(
            `SELECT membership_id AS "membershipId"
            FROM player
            WHERE is_private = true
            ORDER BY membership_id DESC
            LIMIT 1`
        )
        if (!privatePlayer) {
            return
        }

        const result = await playerTeammatesRoute.$mock({
            params: {
                membershipId: privatePlayer.membershipId.toString()
            }
        })

        expectErr(result)
    }

    test("returns 403 for private profile", () => t())
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
    test("returns ok for authorized private profile", async () => {
        const privatePlayer = await pgReader.queryRow<{ membershipId: bigint }>(
            `SELECT membership_id AS "membershipId"
            FROM player
            WHERE is_private = true
            ORDER BY membership_id DESC
            LIMIT 1`
        )
        if (!privatePlayer) {
            return
        }

        const membershipId = privatePlayer.membershipId.toString()
        const token = generateJWT(
            {
                isAdmin: false,
                bungieMembershipId: "123",
                destinyMembershipIds: [membershipId]
            },
            600
        )

        const result = await playerTeammatesRoute.$mock({
            params: {
                membershipId
            },
            headers: {
                authorization: `Bearer ${token}`
            }
        })
        expectOk(result)
    })
})
