import { canAccessProtectedResource } from "@/auth/protected-resource"
import { RaidHubRoute } from "@/core/RaidHubRoute"
import { zInstanceWithPlayers } from "@/schema/components/InstanceWithPlayers"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import {
    zBigIntString,
    zBoolString,
    zCoercedNaturalNumber,
    zCoercedWholeNumber,
    zISODateString,
    zSplitCommaSeparatedString
} from "@/schema/util"
import { getPlayer } from "@/services/player"
import { getInstances } from "@/services/player-instances/instances"
import { z } from "zod"

export const playerInstancesRoute = new RaidHubRoute({
    method: "get",
    description:
        "Find a set of instances based on the query parameters. Some parameters will not work together, such as providing a season outside the range of the min/max season. Requires authentication.",
    params: z.object({
        membershipId: zBigIntString()
    }),
    query: z.object({
        membershipIds: zSplitCommaSeparatedString(z.array(zBigIntString()).max(6))
            .default([])
            .openapi({
                description:
                    "A comma-separated list of up to 6 membershipIds the must be present in the instance. You do not need to include the target membershipId from the path parameter in this list."
            }),
        activityId: zCoercedNaturalNumber().optional(),
        versionId: zCoercedNaturalNumber().optional(),
        completed: zBoolString().optional(),
        fresh: zBoolString().optional(),
        flawless: zBoolString().optional(),
        playerCount: zCoercedNaturalNumber().optional(),
        minPlayerCount: zCoercedNaturalNumber().optional(),
        maxPlayerCount: zCoercedNaturalNumber().optional(),
        minDurationSeconds: zCoercedWholeNumber().optional(),
        maxDurationSeconds: zCoercedWholeNumber().optional(),
        season: zCoercedNaturalNumber().optional(),
        minSeason: zCoercedNaturalNumber().optional(),
        maxSeason: zCoercedNaturalNumber().optional(),
        minDate: zISODateString().optional(),
        maxDate: zISODateString().optional()
    }),
    response: {
        success: {
            statusCode: 200,
            schema: z.array(zInstanceWithPlayers)
        },
        errors: [
            {
                statusCode: 404,
                code: ErrorCode.PlayerNotFoundError,
                schema: z.object({
                    membershipId: zBigIntString()
                })
            },
            {
                statusCode: 403,
                code: ErrorCode.PlayerProtectedResourceError,
                schema: z.object({
                    message: z.string(),
                    membershipId: zBigIntString()
                })
            }
        ]
    },
    async handler(req) {
        const targetMembershipId = req.params.membershipId
        const player = getPlayer(targetMembershipId)
        const canAccess = canAccessProtectedResource(
            targetMembershipId,
            req.headers.authorization ?? ""
        )

        if (!(await player)) {
            return RaidHubRoute.fail(ErrorCode.PlayerNotFoundError, {
                membershipId: targetMembershipId
            })
        } else if (!(await canAccess)) {
            return RaidHubRoute.fail(ErrorCode.PlayerProtectedResourceError, {
                message: "You do not have permission to query on this player's instances",
                membershipId: targetMembershipId
            })
        }

        const allIds = new Set([targetMembershipId, ...req.query.membershipIds])

        const data = await getInstances({
            ...req.query,
            membershipIds: Array.from(allIds),
            count: 100
        })

        return RaidHubRoute.ok(data)
    }
})
