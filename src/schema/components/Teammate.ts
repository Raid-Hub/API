import { registry } from "@/schema"
import { zNaturalNumber, zWholeNumber } from "@/schema/util"
import { z } from "zod"
import { zPlayerInfo } from "./PlayerInfo"

export type Teammate = z.input<typeof zTeammate>
export const zTeammate = registry.register(
    "Teammate",
    z
        .object({
            estimatedTimePlayedSeconds: zNaturalNumber(),
            clears: zWholeNumber(),
            instanceCount: zNaturalNumber(),
            playerInfo: zPlayerInfo
        })
        .strict()
)
