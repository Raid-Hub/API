import { pgReader } from "@/integrations/postgres"
import { convertUInt32Value } from "@/integrations/postgres/transformer"
import { describe, expect, it } from "bun:test"
import { attachDifficultyTiers } from "./resolve"

// Consecrated Mind pantheon hash — above signed int32 max (2_147_483_647).
const UINT32_ABOVE_INT32 = 3975235718
const EMPTY_FEAT = 790421403

describe("difficulty tier feat skull lookup", () => {
    it("queries skull_hash as bigint without int cast overflow", async () => {
        const rows = await pgReader.queryRows<{ skullHash: number }>(
            `SELECT skull_hash AS "skullHash"
             FROM activity_feat_definition
             WHERE skull_hash = ANY($1::bigint[])`,
            {
                params: [[UINT32_ABOVE_INT32, EMPTY_FEAT].map(skull => BigInt(skull))],
                transformers: { skullHash: convertUInt32Value }
            }
        )

        expect(Array.isArray(rows)).toBe(true)
    })

    it("attachDifficultyTiers handles uint32 skull hashes above int32 max", async () => {
        const result = await attachDifficultyTiers([
            {
                skullHashes: [EMPTY_FEAT, UINT32_ABOVE_INT32],
                activityId: 102
            }
        ])

        expect(result).toHaveLength(1)
        expect(result[0].difficultyTier).not.toBeNull()
    })
})
