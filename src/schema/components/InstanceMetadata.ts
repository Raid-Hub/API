import { registry } from "@/schema/registry"
import { z } from "zod"

export type InstanceMetadata = z.input<typeof zInstanceMetadata>
export const zInstanceMetadata = registry.register(
    "InstanceMetadata",
    z.object({
        activityName: z.string(),
        versionName: z.string(),
        isRaid: z.boolean()
    })
)
