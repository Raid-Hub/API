import { registry } from "@/schema"
import { zUInt32, zWholeNumber } from "@/schema/util"
import { z } from "zod"

export type InstanceCharacterWeapon = z.input<typeof zInstanceCharacterWeapon>
export const zInstanceCharacterWeapon = registry.register(
    "InstanceCharacterWeapon",
    z
        .object({
            weaponHash: zUInt32(),
            kills: zWholeNumber(),
            precisionKills: zWholeNumber()
        })
        .strict()
)
