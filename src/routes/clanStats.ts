import { RaidHubRoute } from "@/core/RaidHubRoute"
import { BungieApiError, getClan, getClanMembers } from "@/integrations/bungie"
import { clanQueue, playersQueue } from "@/integrations/rabbitmq/queues"
import { cacheControl } from "@/middleware/cache-control"
import { zClanStats } from "@/schema/components/Clan"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zBigIntString } from "@/schema/input"
import { zInt64 } from "@/schema/output"
import { getClanStats } from "@/services/clans/clan-stats"
import { PlatformErrorCodes } from "bungie-net-core/enums"
import { GroupMember } from "bungie-net-core/models"
import { z } from "zod"

export const clanStatsRoute = new RaidHubRoute({
    method: "get",
    description: "Get the stats for a clan. Data updates weekly.",
    params: z.object({
        groupId: zBigIntString()
    }),
    middleware: [cacheControl(30)],
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
                    groupId: zInt64()
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
    async handler({ params }, after) {
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

        const membershipIds = members.map(member => BigInt(member.destinyUserInfo.membershipId))

        const stats = await getClanStats(groupId, membershipIds)

        after(async () => {
            await Promise.allSettled([
                clanQueue.send(groupId),
                ...membershipIds.map(id => playersQueue.send(id))
            ])
        })

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
