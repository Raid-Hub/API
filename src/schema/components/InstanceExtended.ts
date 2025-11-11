import { registry } from "@/schema/registry"
import { zNaturalNumber } from "@/schema/output"
import { z } from "zod"
import { zInstance } from "./Instance"
import { zInstanceMetadata } from "./InstanceMetadata"
import { zInstancePlayerExtended } from "./InstancePlayerExtended"

export type InstanceExtended = z.input<typeof zInstanceExtended>
export const zInstanceExtended = registry.register(
    "InstanceExtended",
    zInstance
        .extend({
            leaderboardRank: zNaturalNumber().nullable(),
            metadata: zInstanceMetadata,
            players: z.array(zInstancePlayerExtended)
        })
        .openapi({
            example: undefined
        })
)
