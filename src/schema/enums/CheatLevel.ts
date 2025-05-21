import { registry } from "@/schema/registry"
import { z } from "zod"

export enum CheatLevelEnum {
    None = 0,
    Suspicious = 1,
    Moderate = 2,
    Extreme = 3,
    Blacklisted = 4
}

export type CheatLevel = z.infer<typeof zCheatLevel>
export const zCheatLevel = registry.register("CheatLevel", z.nativeEnum(CheatLevelEnum))
