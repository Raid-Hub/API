import { registry } from "@/schema/registry"
import { z } from "zod"

export type IndividualGlobalLeaderboardCategory = z.infer<
    typeof zIndividualGlobalLeaderboardCategory
>
export const zIndividualGlobalLeaderboardCategory = registry.register(
    "IndividualGlobalLeaderboardCategory",
    z.enum(["clears", "full-clears", "sherpas", "speedrun", "world-first-rankings", "in-raid-time"])
)
