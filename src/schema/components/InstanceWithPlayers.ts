import { z } from "zod"
import { zInstance } from "./Instance"
import { zPlayerInfo } from "./PlayerInfo"

/** Route response schema; registered via route's registerResponse(path, schema), not here. */
export type InstanceWithPlayers = z.input<typeof zInstanceWithPlayers>
export const zInstanceWithPlayers = zInstance
    .extend({
        players: z.array(zPlayerInfo)
    })
    .openapi({
        example: undefined
    })
