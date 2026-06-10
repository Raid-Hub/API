import { registry } from "@/schema/registry"
import { z } from "zod"

export enum DifficultyTier {
    Adventure = "adventure",
    Standard = "standard",
    Custom = "custom"
}

export type DifficultyTierValue = z.infer<typeof zDifficultyTier>
export const zDifficultyTier = registry.register(
    "DifficultyTier",
    z.nativeEnum(DifficultyTier).openapi({
        description:
            "MotT difficulty tier derived at read time from instance skull_hashes and activity_feat_definition. " +
            "Adventure uses fixed skulls; Custom has selected feats; Standard is Custom with no feats."
    })
)
