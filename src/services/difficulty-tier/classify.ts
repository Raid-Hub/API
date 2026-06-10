import { DifficultyTier } from "@/schema/enums/DifficultyTier"

const SKULL_ADVENTURE_TIME_ON_YOUR_SIDE = 845104503
const SKULL_ADVENTURE_FIXED = 2008962334
const SKULL_EMPTY_FEAT = 790421403

export function dedupeSkullHashes(skullHashes: readonly number[]): number[] {
    const seen = new Set<number>()
    const out: number[] = []
    for (const skull of skullHashes) {
        if (skull === 0 || seen.has(skull)) {
            continue
        }
        seen.add(skull)
        out.push(skull)
    }
    return out
}

/** Classify difficulty tier from deduplicated PGCR skulls and feat skulls resolved at query time. */
export function classifyDifficultyTier(
    skullHashes: readonly number[],
    knownFeatSkulls: ReadonlySet<number>,
    activityHasTierCollection: boolean
): DifficultyTier | null {
    const unique = dedupeSkullHashes(skullHashes)

    if (
        unique.includes(SKULL_ADVENTURE_TIME_ON_YOUR_SIDE) ||
        unique.includes(SKULL_ADVENTURE_FIXED)
    ) {
        return DifficultyTier.Adventure
    }

    const hasEmptyFeat = unique.includes(SKULL_EMPTY_FEAT)
    const optionalSelected = unique.filter(
        skull => skull !== SKULL_EMPTY_FEAT && knownFeatSkulls.has(skull)
    )

    if (!activityHasTierCollection && !hasEmptyFeat && optionalSelected.length === 0) {
        return null
    }

    if (optionalSelected.length === 0) {
        return DifficultyTier.Standard
    }

    // Customize-portal launches always report two default optional feats in PGCR skulls.
    if (hasEmptyFeat && optionalSelected.length >= 2) {
        return optionalSelected.length > 2 ? DifficultyTier.Custom : DifficultyTier.Standard
    }

    return DifficultyTier.Custom
}

export function activityHasTierCollection(activityId: number): boolean {
    return activityId === 101 || activityId === 102
}
