import { zNaturalNumber } from "@/schema/output"
import { z } from "zod"
import { zInstance } from "./Instance"
import { zInstanceMetadata } from "./InstanceMetadata"
import { zInstancePlayerExtended } from "./InstancePlayerExtended"

/** Route response schema; registered via route's registerResponse(path, schema), not here. */
export type InstanceExtended = z.input<typeof zInstanceExtended>
export const zInstanceExtended = zInstance
    .extend({
        leaderboardRank: zNaturalNumber().nullable(),
        metadata: zInstanceMetadata,
        players: z.array(zInstancePlayerExtended)
    })
    .openapi({
        example: undefined
    })
