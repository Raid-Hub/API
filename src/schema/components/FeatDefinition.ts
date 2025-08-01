import { registry } from "@/schema/registry"
import { zUInt32, zWholeNumber } from "@/schema/util"
import { z } from "zod"

export type FeatDefinition = z.input<typeof zFeatDefinition>
export const zFeatDefinition = registry.register(
    "FeatDefinition",
    z
        .object({
            hash: zUInt32(),
            skullHash: zUInt32(),
            name: z.string(),
            shortName: z.string(),
            description: z.string(),
            shortDescription: z.string(),
            iconPath: z.string(),
            modifierPowerContribution: zWholeNumber()
        })
        .strict()
)
