import { registry } from "@/schema"
import { z } from "zod"
import { zInstanceCharacter } from "./InstanceCharacter"
import { zInstancePlayer } from "./InstancePlayer"
import { zPlayerInfo } from "./PlayerInfo"

export type InstancePlayerExtended = z.input<typeof zInstancePlayerExtended>
export const zInstancePlayerExtended = registry.register(
    "InstancePlayerExtended",
    zInstancePlayer
        .extend({
            playerInfo: zPlayerInfo,
            characters: z.array(zInstanceCharacter)
        })
        .openapi({
            example: undefined
        })
)
