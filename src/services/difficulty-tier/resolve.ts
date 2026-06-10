import { pgReader } from "@/integrations/postgres"
import { convertUInt32Value } from "@/integrations/postgres/transformer"
import { DifficultyTier } from "@/schema/enums/DifficultyTier"
import { activityHasTierCollection, classifyDifficultyTier } from "./classify"

async function loadKnownFeatSkulls(
    skullHashes: readonly number[] | null | undefined
): Promise<Set<number>> {
    const unique = [...new Set((skullHashes ?? []).filter(skull => skull !== 0))]
    if (unique.length === 0) {
        return new Set()
    }

    const rows = await pgReader.queryRows<{ skullHash: number }>(
        `SELECT skull_hash AS "skullHash"
         FROM activity_feat_definition
         WHERE skull_hash = ANY($1::bigint[])`,
        {
            params: [unique.map(skull => BigInt(skull))],
            transformers: { skullHash: convertUInt32Value }
        }
    )

    return new Set(rows.map(row => row.skullHash))
}

type InstanceWithSkulls = {
    skullHashes: readonly number[] | null | undefined
    activityId: number
}

export async function resolveDifficultyTier(
    instance: InstanceWithSkulls
): Promise<DifficultyTier | null> {
    const knownFeatSkulls = await loadKnownFeatSkulls(instance.skullHashes)
    return classifyDifficultyTier(
        instance.skullHashes,
        knownFeatSkulls,
        activityHasTierCollection(instance.activityId)
    )
}

export async function attachDifficultyTier<T extends InstanceWithSkulls>(
    instance: T
): Promise<T & { difficultyTier: DifficultyTier | null }> {
    const [withTier] = await attachDifficultyTiers([instance])
    return withTier
}

export async function attachDifficultyTiers<T extends InstanceWithSkulls>(
    instances: T[]
): Promise<(T & { difficultyTier: DifficultyTier | null })[]> {
    if (instances.length === 0) {
        return []
    }

    const allSkulls = instances.flatMap(instance => instance.skullHashes ?? [])
    const knownFeatSkulls = await loadKnownFeatSkulls(allSkulls)

    return instances.map(instance => ({
        ...instance,
        difficultyTier: classifyDifficultyTier(
            instance.skullHashes,
            knownFeatSkulls,
            activityHasTierCollection(instance.activityId)
        )
    }))
}
