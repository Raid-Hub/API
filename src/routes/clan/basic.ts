import { RaidHubRoute } from "@/core/RaidHubRoute"
import { BungieApiError, getClan } from "@/integrations/bungie"
import { cacheControl } from "@/middleware/cache-control"
import { zClanBasic } from "@/schema/components/ClanBasic"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zBigIntString } from "@/schema/input"
import { zInt64 } from "@/schema/output"
import { PlatformErrorCodes } from "bungie-net-core/enums"
import { z } from "zod"

export const clanBasicRoute = new RaidHubRoute({
    method: "get",
    description:
        "Low-cost clan identity (name, tag, avatar path) for bots and UIs. Does not load member rosters.",
    params: z.object({
        groupId: zBigIntString()
    }),
    middleware: [cacheControl(300)],
    response: {
        success: {
            statusCode: 200,
            schema: zClanBasic
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
    async handler({ params }) {
        const groupId = params.groupId
        try {
            const clan = await getClan(groupId)
            if (!clan) {
                return RaidHubRoute.fail(ErrorCode.ClanNotFound, {
                    groupId
                })
            }
            const d = clan.detail
            return RaidHubRoute.ok({
                groupId: BigInt(d.groupId),
                name: d.name,
                callSign: d.clanInfo.clanCallsign,
                motto: d.motto,
                avatarPath: d.avatarPath || null
            })
        } catch (err) {
            return handleErr(err, groupId)
        }
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
        }
        if (err.cause.ErrorCode === PlatformErrorCodes.SystemDisabled) {
            return RaidHubRoute.fail(ErrorCode.BungieServiceOffline, {
                message: err.message,
                route: err.url.pathname + err.url.search
            })
        }
    }
    throw err
}
