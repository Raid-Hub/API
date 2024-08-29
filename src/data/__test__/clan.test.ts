import { describe, expect, it } from "bun:test"
import { zClanStats } from "../../schema/components/Clan"
import { getClanMembers } from "../../services/bungie/getClanMembers"
import { getClanStats } from "../clan"

describe("getClanStats", () => {
    it("returns the correct shape", async () => {
        const members = await getClanMembers("3148408")
        const data = await getClanStats(members.map(m => m.destinyUserInfo.membershipId)).catch(
            console.error
        )

        const parsed = zClanStats.safeParse(data)
        if (!parsed.success) {
            console.error(parsed.error.errors)
            expect(parsed.error.errors).toHaveLength(0)
        } else {
            expect(parsed.success).toBe(true)
        }
    })
})
