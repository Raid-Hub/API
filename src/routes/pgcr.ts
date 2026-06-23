import { RaidHubRoute } from "@/core/RaidHubRoute"
import { cacheControl } from "@/middleware/cache-control"
import {
    RaidHubPostGameCarnageReport,
    zRaidHubPostGameCarnageReport
} from "@/schema/components/RaidHubPostGameCarnageReport"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zBigIntString } from "@/schema/input"
import { zInt64 } from "@/schema/output"
import { decodePgcrPayload, getRawCompressedPGCR } from "@/services/pgcr"
import { z } from "zod"

export const pgcrRoute = new RaidHubRoute({
    method: "get",
    description: `Get a raw post game carnage report by instanceId. 
This is essentially the raw data from the Bungie API, with a few fields trimmed off. 
It should be a subset of the data returned by the Bungie API. 
Useful if you need to access PGCRs when Bungie's API is down.`,
    params: z.object({
        instanceId: zBigIntString()
    }),
    middleware: [cacheControl(86400)],
    response: {
        success: {
            statusCode: 200,
            schema: zRaidHubPostGameCarnageReport
        },
        errors: [
            {
                statusCode: 404,
                code: ErrorCode.PGCRNotFoundError,
                schema: z.object({
                    instanceId: zInt64()
                })
            }
        ]
    },
    async handler({ params }) {
        const instanceId = params.instanceId

        const result = await getRawCompressedPGCR(instanceId)
        if (!result) {
            return RaidHubRoute.fail(ErrorCode.PGCRNotFoundError, { instanceId })
        }

        const pgcr = JSON.parse(decodePgcrPayload(result.data)) as RaidHubPostGameCarnageReport
        pgcr.activityDetails.instanceId = BigInt(pgcr.activityDetails.instanceId)
        pgcr.entries.forEach(entry => {
            entry.characterId = BigInt(entry.characterId)
            entry.player.destinyUserInfo.membershipId = BigInt(
                entry.player.destinyUserInfo.membershipId
            )
        })
        pgcr.period = new Date(pgcr.period)

        return RaidHubRoute.ok(pgcr)
    }
})
