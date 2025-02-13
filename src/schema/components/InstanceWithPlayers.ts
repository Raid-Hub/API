import { z } from "zod"
import { registry } from ".."
import { zInstance } from "./Instance"
import { zPlayerInfo } from "./PlayerInfo"

export type InstanceWithPlayers = z.input<typeof zInstanceWithPlayers>
export const zInstanceWithPlayers = registry.register(
    "InstanceWithPlayers",
    zInstance
        .extend({
            players: z.array(zPlayerInfo)
        })
        .openapi({
            example: undefined
        })
)
