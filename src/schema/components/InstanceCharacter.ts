import { registry } from "@/schema/registry"
import { zInt64, zUInt32, zWholeNumber } from "@/schema/output"
import { z } from "zod"
import { zInstanceCharacterWeapon } from "./InstanceCharacterWeapon"

export type InstanceCharacter = z.input<typeof zInstanceCharacter>
export const zInstanceCharacter = registry.register(
    "InstanceCharacter",
    z
        .object({
            characterId: zInt64(),
            classHash: zUInt32().nullable(),
            emblemHash: zUInt32().nullable(),
            completed: z.boolean(),
            timePlayedSeconds: zWholeNumber(),
            startSeconds: zWholeNumber(),
            score: zWholeNumber(),
            kills: zWholeNumber(),
            deaths: zWholeNumber(),
            assists: zWholeNumber(),
            precisionKills: zWholeNumber(),
            superKills: zWholeNumber(),
            grenadeKills: zWholeNumber(),
            meleeKills: zWholeNumber(),
            weapons: z.array(zInstanceCharacterWeapon)
        })
        .strict()
)
