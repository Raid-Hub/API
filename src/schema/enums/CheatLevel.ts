import { registry } from "@/schema/registry"
import { z } from "zod"

enum CheatLevelEnum {
    None = 0,
    Low = 1,
    Medium = 2,
    High = 3,
    Extreme = 4
}

export type CheatLevel = z.infer<typeof zCheatLevel>
export const zCheatLevel = registry.register("CheatLevel", z.nativeEnum(CheatLevelEnum))
