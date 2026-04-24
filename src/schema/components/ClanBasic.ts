import { zInt64 } from "@/schema/output"
import { registry } from "@/schema/registry"
import { z } from "zod"

export type ClanBasic = z.input<typeof zClanBasic>
export const zClanBasic = registry.register(
    "ClanBasic",
    z
        .object({
            groupId: zInt64(),
            name: z.string(),
            callSign: z.string(),
            motto: z.string(),
            avatarPath: z.string().nullable()
        })
        .strict()
)
