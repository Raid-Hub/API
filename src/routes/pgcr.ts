import { gunzipSync } from "zlib"
import { z } from "zod"
import { RaidHubRoute } from "../RaidHubRoute"
import { getRawCompressedPGCR } from "../data-access-layer/pgcr"
import { cacheControl } from "../middlewares/cache-control"
import {
    RaidHubPostGameCarnageReport,
    zRaidHubPostGameCarnageReport
} from "../schema/components/RaidHubPostGameCarnageReport"
import { ErrorCode } from "../schema/errors/ErrorCode"
import { zBigIntString } from "../schema/util"

const decoder = new TextDecoder()

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
                type: ErrorCode.PGCRNotFoundError,
                schema: z.object({
                    instanceId: zBigIntString()
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

        const decompressed = gunzipSync(result.data)
        const pgcr = JSON.parse(decoder.decode(decompressed)) as RaidHubPostGameCarnageReport
        return RaidHubRoute.ok(pgcr)
    }
})
