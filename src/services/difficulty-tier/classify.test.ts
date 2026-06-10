import { DifficultyTier } from "@/schema/enums/DifficultyTier"
import { describe, expect, it } from "bun:test"
import { classifyDifficultyTier } from "./classify"

const EMPTY_FEAT = 790421403
const PHASE_LIMIT = 251257575
const CUTTHROAT = 2673088233
const TOKEN_LIMIT = 3123804375
const ADVENTURE = 845104503

describe("classifyDifficultyTier", () => {
    const knownFeats = new Set([PHASE_LIMIT, CUTTHROAT, TOKEN_LIMIT])

    it("returns adventure when adventure skull is present", () => {
        expect(classifyDifficultyTier([ADVENTURE], knownFeats, true)).toBe(DifficultyTier.Adventure)
    })

    it("returns standard for featured custom with only empty feat", () => {
        expect(classifyDifficultyTier([EMPTY_FEAT], knownFeats, true)).toBe(DifficultyTier.Standard)
    })

    it("returns custom for featured custom with a selected feat", () => {
        expect(classifyDifficultyTier([EMPTY_FEAT, TOKEN_LIMIT], knownFeats, true)).toBe(
            DifficultyTier.Custom
        )
    })

    it("returns standard for customize-portal baseline feats", () => {
        expect(classifyDifficultyTier([EMPTY_FEAT, PHASE_LIMIT, CUTTHROAT], knownFeats, true)).toBe(
            DifficultyTier.Standard
        )
    })

    it("returns custom for customize-portal with an extra feat", () => {
        expect(
            classifyDifficultyTier(
                [EMPTY_FEAT, PHASE_LIMIT, CUTTHROAT, TOKEN_LIMIT],
                knownFeats,
                true
            )
        ).toBe(DifficultyTier.Custom)
    })

    it("returns standard for featured pantheon with no tier skulls", () => {
        expect(classifyDifficultyTier([], knownFeats, true)).toBe(DifficultyTier.Standard)
    })

    it("returns null for non-tier activities", () => {
        expect(classifyDifficultyTier([], knownFeats, false)).toBeNull()
    })

    it("handles null skull hashes", () => {
        expect(classifyDifficultyTier(null, knownFeats, false)).toBeNull()
        expect(classifyDifficultyTier(null, knownFeats, true)).toBe(DifficultyTier.Standard)
    })
})
