import { PlatformErrorCodes } from "bungie-net-core/enums"
import { GroupMember } from "bungie-net-core/models"
import { z } from "zod"
import { RaidHubRoute } from "../RaidHubRoute"
import { getClanStats } from "../data/clan"
import { cacheControl } from "../middlewares/cache-control"
import { processClanAsync } from "../middlewares/processClanAsync"
import { zClanStats } from "../schema/components/Clan"
import { ErrorCode } from "../schema/errors/ErrorCode"
import { zBigIntString } from "../schema/util"
import { BungieApiError } from "../services/bungie/error"
import { getClan } from "../services/bungie/getClan"
import { getClanMembers } from "../services/bungie/getClanMembers"

export const clanStatsRoute = new RaidHubRoute({
    method: "get",
    description: "Get the stats for a clan. Data updates weekly.",
    params: z.object({
        groupId: zBigIntString()
    }),
    middleware: [cacheControl(30), processClanAsync],
    response: {
        success: {
            statusCode: 200,
            schema: zClanStats
        },
        errors: [
            {
                statusCode: 404,
                code: ErrorCode.ClanNotFound,
                schema: z.object({
                    groupId: zBigIntString()
                })
            },
            {
                statusCode: 503,
                code: ErrorCode.BungieServiceOffline,
                schema: z.object({
                    message: z.string(),
                    route: z.string()
                })
            }
        ] as const
    },
    async handler({ params }) {
        const groupId = params.groupId

        try {
            const clan = await getClan(groupId)
            if (!clan) {
                return RaidHubRoute.fail(ErrorCode.ClanNotFound, {
                    groupId
                })
            }
        } catch (err) {
            return handleErr(err, groupId)
        }

        let members: GroupMember[]
        try {
            members = await getClanMembers(groupId)
        } catch (err) {
            return handleErr(err, groupId)
        }

        const stats = await getClanStats(members.map(m => m.destinyUserInfo.membershipId))

        return RaidHubRoute.ok(stats)
    }
})

const handleErr = (err: unknown, groupId: bigint) => {
    if (err instanceof BungieApiError) {
        if (
            err.cause.ErrorCode === PlatformErrorCodes.ClanNotFound ||
            err.cause.ErrorCode === PlatformErrorCodes.GroupNotFound
        ) {
            return RaidHubRoute.fail(ErrorCode.ClanNotFound, {
                groupId
            })
        } else if (err.cause.ErrorCode === PlatformErrorCodes.SystemDisabled) {
            return RaidHubRoute.fail(ErrorCode.BungieServiceOffline, {
                message: err.message,
                route: err.url.pathname + err.url.searchParams.toString()
            })
        }
    }
    throw err
}
