import { registry } from "@/schema/registry"
import { zWholeNumber } from "@/schema/util"
import { z } from "zod"

export type InstancePlayer = z.input<typeof zInstancePlayer>
export const zInstancePlayer = registry.register(
    "InstancePlayer",
    z
        .object({
            completed: z.boolean(),
            isFirstClear: z.boolean(),
            sherpas: zWholeNumber(),
            timePlayedSeconds: zWholeNumber()
        })
        .strict()
)
