import { z } from "zod"
import { registry } from ".."
import { zBigIntString, zPage } from "../util"

export const zLeaderboardPagination = registry.register(
    "LeaderboardPagination",
    z
        .object({
            count: z.coerce.number().int().min(10).max(100).default(50),
            search: zBigIntString().optional(),
            page: zPage().openapi({
                description:
                    "Page number of leaderboard data. Ignored if `search` is provided. Defaults to 1"
            })
        })
        .openapi({
            description: "Pagination parameters for leaderboard data"
        })
)
