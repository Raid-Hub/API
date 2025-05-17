import { registry } from "@/schema"
import { z } from "zod"
import { zInstance } from "./Instance"
import { zInstancePlayer } from "./InstancePlayer"

export type InstanceForPlayer = z.input<typeof zInstanceForPlayer>
export const zInstanceForPlayer = registry.register(
    "InstanceForPlayer",
    zInstance
        .extend({
            player: zInstancePlayer
        })
        .openapi({
            example: undefined
        })
)
