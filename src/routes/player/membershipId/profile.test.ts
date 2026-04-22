import { afterAll, beforeAll, describe, test } from "bun:test"
import { Pool } from "pg"

import { generateJWT } from "@/auth/jwt"
import { expectErr, expectOk } from "@/lib/test-utils"

import { playerProfileRoute } from "./profile"

const publicMembershipId = "4611686019000000101"
const noClearsMembershipId = "4611686019000000102"
const privateMembershipId = "4611686019000000103"

const fixtureDb = new Pool({
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: "raidhub",
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.POSTGRES_PORT || 5432)
})

beforeAll(async () => {
    await fixtureDb.query(
        `DELETE FROM core.player WHERE membership_id IN ($1::bigint, $2::bigint, $3::bigint)`,
        [publicMembershipId, noClearsMembershipId, privateMembershipId]
    )

    await fixtureDb.query(
        `INSERT INTO core.player (
            membership_id, membership_type, icon_path, display_name,
            bungie_global_display_name, bungie_global_display_name_code, last_seen, first_seen,
            clears, fresh_clears, sherpas, total_time_played_seconds, sum_of_best, wfr_score,
            cheat_level, is_private, is_whitelisted, updated_at
        ) VALUES
        ($1::bigint, 3, NULL, 'fixture_public_profile', 'fixture_public_profile', '0101', NOW(), NOW(), 5, 2, 1, 3000, 500, 0, 0, false, false, NOW()),
        ($2::bigint, 3, NULL, 'fixture_no_clears', 'fixture_no_clears', '0102', NOW(), NOW(), 0, 0, 0, 0, NULL, 0, 0, false, false, NOW()),
        ($3::bigint, 3, NULL, 'fixture_private_profile', 'fixture_private_profile', '0103', NOW(), NOW(), 2, 1, 0, 1200, 400, 0, 0, true, false, NOW())`,
        [publicMembershipId, noClearsMembershipId, privateMembershipId]
    )
})

afterAll(async () => {
    await fixtureDb.query(
        `DELETE FROM core.player WHERE membership_id IN ($1::bigint, $2::bigint, $3::bigint)`,
        [publicMembershipId, noClearsMembershipId, privateMembershipId]
    )
    await fixtureDb.end()
})

describe("player profile 200", () => {
    const t = async (membershipId: string) => {
        const result = await playerProfileRoute.$mock({ params: { membershipId } })
        expectOk(result)
    }

    test("returns profile for valid player id", () => t(publicMembershipId))

    test("returns profile for player with no clears", () => t(noClearsMembershipId))
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

    test("returns 403 for private profile without authorization", () => t(privateMembershipId))
})

describe("player profile authorized", () => {
    const token = generateJWT(
        {
            isAdmin: false,
            bungieMembershipId: "123",
            destinyMembershipIds: [privateMembershipId]
        },
        600
    )

    playerProfileRoute
        .$mock({
            params: {
                membershipId: privateMembershipId
            },
            headers: {
                authorization: `Bearer ${token}`
            }
        })
        .then(result => expectOk(result))
})
