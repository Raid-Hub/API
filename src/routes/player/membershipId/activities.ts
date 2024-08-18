import { z } from "zod"
import { RaidHubRoute } from "../../../RaidHubRoute"
import { getActivities } from "../../../data-access-layer/history"
import { getPlayer } from "../../../data-access-layer/player"
import { zInstanceForPlayer } from "../../../schema/components/InstanceForPlayer"
import { ErrorCode } from "../../../schema/errors/ErrorCode"
import { zBigIntString, zISODateString } from "../../../schema/util"
import { canAccessPrivateProfile } from "../../../util/auth"

export const playerActivitiesRoute = new RaidHubRoute({
    method: "get",
    description: `Get a player's activity history. This endpoint uses date cursors to paginate through a player's activity history. 
The first request should not include a cursor. Subsequent requests should include the \`nextCursor\` 
value from the previous response. Note that the first request may not return the full number of activities requested
in order to optimize performance. Subsequent requests will return the full number of activities requested.`,
    isProtectedPlayerRoute: true,
    params: z.object({
        membershipId: zBigIntString()
    }),
    query: z.object({
        count: z.coerce.number().int().min(10).max(5000).default(2000),
        cursor: zISODateString().optional()
    }),

    response: {
        success: {
            statusCode: 200,
            schema: z
                .object({
                    membershipId: zBigIntString(),
                    nextCursor: zISODateString().nullable(),
                    activities: z.array(zInstanceForPlayer)
                })
                .strict()
        },
        errors: [
            {
                statusCode: 404,
                type: ErrorCode.PlayerNotFoundError,
                schema: z.object({
                    membershipId: zBigIntString()
                })
            },
            {
                statusCode: 403,
                type: ErrorCode.PlayerPrivateProfileError,
                schema: z.object({
                    membershipId: zBigIntString()
                })
            }
        ]
    },
    middleware: [
        (req, res, next) => {
            // save the previous send method
            const _send = res.send.bind(res)

            // override the json method to cache with 200's
            res.send = body => {
                if (res.statusCode === 200) {
                    // Cache for 1 day if we have a cursor, otherwise 30 seconds
                    res.setHeader("Cache-Control", `max-age=${req.query.cursor ? 86400 : 30}`)
                }
                return _send(body)
            }
            next()
        }
    ],
    async handler(req) {
        const { membershipId } = req.params
        const { cursor, count } = req.query

        const player = await getPlayer(membershipId)

        if (!player) {
            return RaidHubRoute.fail(ErrorCode.PlayerNotFoundError, { membershipId })
        } else if (
            player.isPrivate &&
            !(await canAccessPrivateProfile(membershipId, req.headers.authorization ?? ""))
        ) {
            return RaidHubRoute.fail(ErrorCode.PlayerPrivateProfileError, { membershipId })
        }

        const activities = cursor
            ? await getActivities(membershipId, {
                  count,
                  cursor
              })
            : await getFirstPageOfActivities(membershipId, count)

        const countFound = activities.length

        // If we found the max number of activities, we need to check if there are more
        // Or if this was a "first page" request, we need to check if there are more
        const nextCursor =
            countFound === count || (!cursor && countFound > 0)
                ? activities[countFound - 1].dateCompleted
                : null

        return RaidHubRoute.ok({
            membershipId,
            nextCursor,
            activities
        })
    }
})

/* This allows us to fetch the same set of activities for the first request each day, making caching just a bit better. We
    can cache subsequent pages, while leaving the first one open */
async function getFirstPageOfActivities(membershipId: bigint, count: number) {
    const today = new Date()
    today.setUTCHours(10, 0, 0, 0)

    const lastMonth = new Date(today)
    lastMonth.setUTCMonth(today.getUTCMonth() - 1, 0)

    const activities = await getActivities(membershipId, {
        cutoff: lastMonth,
        count
    })
    if (activities.length) {
        return activities
    }

    // If we don't have any activities from last month, try last year
    const lastYear = new Date(today)
    lastYear.setFullYear(today.getUTCFullYear() - 1, 0, 0)

    const lastYearActivities = await getActivities(membershipId, {
        cutoff: lastYear,
        count
    })
    if (lastYearActivities.length) {
        return lastYearActivities
    }

    // If we don't have any activities from last year, just get the first page
    return await getActivities(membershipId, {
        count
    })
}
