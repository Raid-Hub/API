import { RaidHubRoute } from "@/core/RaidHubRoute"
import { zCheatLevel } from "@/schema/enums/CheatLevel"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zBigIntString } from "@/schema/input"
import { zInt64 } from "@/schema/output"
import { getPlayer } from "@/services/player"
import { updatePlayer } from "@/services/reporting/update-player"
import { z } from "zod"

export const patchPlayer = new RaidHubRoute({
    isAdministratorRoute: true,
    method: "patch",
    description: "Update fields on a player. Currently, only the cheat level can be updated.",
    params: z.object({
        membershipId: zBigIntString()
    }),
    body: z.object({
        cheatLevel: zCheatLevel.optional()
    }),
    response: {
        success: {
            statusCode: 200,
            schema: z.string()
        },
        errors: [
            {
                statusCode: 404,
                code: ErrorCode.PlayerNotFoundError,
                schema: z.object({
                    membershipId: zInt64()
                })
            }
        ]
    },
    async handler(req) {
        const membershipId = req.params.membershipId

        const player = await getPlayer(membershipId)

        if (!player) {
            return RaidHubRoute.fail(ErrorCode.PlayerNotFoundError, {
                membershipId
            })
        }

        await updatePlayer({
            membershipId,
            cheatLevel: req.body.cheatLevel ?? null
        })

        return RaidHubRoute.ok(
            `Player '${player.bungieGlobalDisplayName ?? player.displayName ?? player.membershipId}' updated successfully.`
        )
    }
})
