import { z } from "zod"
import { RaidHubRoute } from "../RaidHubRoute"
import { cacheControl } from "../middlewares/cache-control"
import { zISODateString } from "../schema/util"
import { getDestiny2Status } from "../services/bungie/getDestiny2Status"
import { postgres } from "../services/postgres"
import { getAtlasStatus } from "../services/prometheus/getAtlasStatus"

// This state tracks the status of the Destiny API and debounces it with a grace period of 60 seconds.
export const statusState = {
    debounce: 60000,
    isDestinyApiEnabled: true,
    timer: null as Timer | null,
    debounceOfflineEvent: function () {
        if (!this.isDestinyApiEnabled) {
            if (this.timer) {
                // API is already offline but there is a timer set to bring it back online.
                this.clearTimer()
            }
            return
        }

        if (this.timer) {
            // API is online and there is already a timer set to bring it offline.
            return
        }

        this.timer = setTimeout(() => {
            this.isDestinyApiEnabled = false
            this.timer = null
        }, this.debounce)
    },
    debounceOnlineEvent: function () {
        if (this.isDestinyApiEnabled) {
            if (this.timer) {
                // API is already ofline but there is a timer set to bring it offline.
                this.clearTimer()
            }
            return
        }

        if (this.timer) {
            // API is offline and there is already a timer set to bring it online.
            return
        }

        this.timer = setTimeout(() => {
            this.isDestinyApiEnabled = true
            this.timer = null
        }, this.debounce)
    },
    clearTimer: function () {
        if (this.timer) {
            clearTimeout(this.timer)
            this.timer = null
        }
    }
}

export const statusRoute = new RaidHubRoute({
    method: "get",
    description: "Get the status of the RaidHub Services.",
    middleware: [cacheControl(5)],
    response: {
        success: {
            statusCode: 200,
            schema: z.object({
                AtlasPGCR: z.object({
                    status: z.enum(["Crawling", "Idle", "Offline"]),
                    medianSecondsBehindNow: z.number().nullable(),
                    estimatedCatchUpTimestamp: zISODateString().nullable(),
                    latestActivity: z.object({
                        dateCompleted: zISODateString(),
                        instanceId: z.string()
                    })
                })
            })
        }
    },
    async handler() {
        const [latestActivity, atlasStatus, isDestinyApiEnabled] = await Promise.all([
            getLatestActivityByDate(),
            getAtlasStatus(),
            getDestiny2Status().catch(() => false)
        ])

        if (isDestinyApiEnabled) {
            statusState.debounceOnlineEvent()
        } else {
            statusState.debounceOfflineEvent()
        }

        if (!statusState.isDestinyApiEnabled) {
            return RaidHubRoute.ok({
                AtlasPGCR: {
                    status: "Idle" as const,
                    medianSecondsBehindNow:
                        atlasStatus.lag !== null ? Math.round(1000 * atlasStatus.lag) / 1000 : null,
                    estimatedCatchUpTimestamp: null,
                    latestActivity
                }
            })
        }

        if (!atlasStatus.isCrawling) {
            return RaidHubRoute.ok({
                AtlasPGCR: {
                    status: "Offline" as const,
                    medianSecondsBehindNow: null,
                    estimatedCatchUpTimestamp: null,
                    latestActivity
                }
            })
        }

        return RaidHubRoute.ok({
            AtlasPGCR: {
                status: "Crawling" as const,
                medianSecondsBehindNow: Math.round(1000 * atlasStatus.lag) / 1000,
                estimatedCatchUpTimestamp:
                    atlasStatus.estimatedCatchUpTime <= 0
                        ? null
                        : new Date(Date.now() + atlasStatus.estimatedCatchUpTime * 1000),
                latestActivity
            }
        })
    }
})

const getLatestActivityByDate = async () => {
    const latestActivity = await postgres.queryRow<{
        dateCompleted: Date
        instanceId: string
    }>(
        `SELECT * FROM (
            SELECT 
                date_completed AT TIME ZONE 'UTC' AS "dateCompleted", 
                instance_id::text AS "instanceId"
            FROM instance 
            ORDER BY instance_id DESC 
            LIMIT 50
        ) AS t1 
        ORDER BY "dateCompleted" DESC 
        LIMIT 1`
    )

    if (!latestActivity) {
        throw new Error("Postgres query failed")
    }

    return latestActivity
}
