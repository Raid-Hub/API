import { RaidHubRoute } from "@/core/RaidHubRoute"
import { getDestiny2Status } from "@/integrations/bungie"
import { InternalApiError } from "@/lib/utils/internal-api-client"
import { Logger } from "@/lib/utils/logging"
import { cacheControl } from "@/middleware/cache-control"
import {
    AtlasStatus,
    FloodgatesStatus,
    zAtlasStatus,
    zFloodgatesStatus
} from "@/schema/components/Status"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { getAtlasStatus } from "@/services/atlas"
import { getFloodgatesRecentId, getFloodgatesStatus } from "@/services/floodgates"
import { getInstanceBasic } from "@/services/instance/instance"
import { getLatestInstanceByDate } from "@/services/instance/latest"
import { z } from "zod"

const logger = new Logger("STATUS_ROUTE")

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
    description:
        "Get the status of the RaidHub Services. Atlas: The PGCR crawler. Floodgates: The queue system for redacted PGCRs from bungie, almost exclusively during contest mode.",
    middleware: [cacheControl(10)],
    response: {
        success: {
            statusCode: 200,
            schema: z.object({
                AtlasPGCR: zAtlasStatus,
                FloodgatesPGCR: zFloodgatesStatus
            })
        },
        errors: [
            {
                statusCode: 503,
                code: ErrorCode.ServiceUnavailableError,
                schema: z.object({
                    serviceName: z.string(),
                    message: z.string()
                })
            }
        ]
    },
    async handler() {
        try {
            const [atlasPGCR, floodgatesPGCR] = await Promise.all([
                getAtlasPGCR(),
                getFloodgatesPGCR()
            ])

            return RaidHubRoute.ok({
                AtlasPGCR: atlasPGCR,
                FloodgatesPGCR: floodgatesPGCR
            })
        } catch (err) {
            if (err instanceof InternalApiError) {
                // log the error as a error for sentry
                logger.error("INTERNAL_API_ERROR", err, {
                    serviceName: err.serviceName,
                    url: err.url.toString(),
                    status: err.status,
                    statusText: err.statusText
                })
                return RaidHubRoute.fail(ErrorCode.ServiceUnavailableError, {
                    serviceName: err.serviceName,
                    message: "Internal service unavailable"
                })
            } else {
                throw err
            }
        }
    }
})

async function getAtlasPGCR(): Promise<AtlasStatus> {
    const [latestResolvedInstance, atlasStatus, isDestinyApiEnabled] = await Promise.all([
        getLatestInstanceByDate(),
        getAtlasStatus(),
        getDestiny2Status().catch(() => false)
    ])

    if (isDestinyApiEnabled) {
        statusState.debounceOnlineEvent()
    } else {
        statusState.debounceOfflineEvent()
    }

    if (!statusState.isDestinyApiEnabled) {
        return {
            status: "Idle" as const,
            medianSecondsBehindNow:
                atlasStatus.lag !== null ? Math.round(1000 * atlasStatus.lag) / 1000 : null,
            estimatedCatchUpTimestamp: null,
            latestResolvedInstance: latestResolvedInstance
                ? {
                      ...latestResolvedInstance,
                      instanceId: latestResolvedInstance.instanceId.toString()
                  }
                : null
        }
    }

    if (!atlasStatus.isCrawling) {
        return {
            status: "Offline" as const,
            medianSecondsBehindNow: null,
            estimatedCatchUpTimestamp: null,
            latestResolvedInstance: latestResolvedInstance
                ? {
                      ...latestResolvedInstance,
                      instanceId: latestResolvedInstance.instanceId.toString()
                  }
                : null
        }
    }

    return {
        status: "Crawling" as const,
        medianSecondsBehindNow: Math.round(1000 * atlasStatus.lag) / 1000,
        estimatedCatchUpTimestamp:
            atlasStatus.estimatedCatchUpTime >= 100 &&
            atlasStatus.estimatedCatchUpTime < 0.5 * atlasStatus.lag
                ? new Date(Date.now() + atlasStatus.estimatedCatchUpTime * 1000)
                : null,
        latestResolvedInstance: latestResolvedInstance
            ? {
                  ...latestResolvedInstance,
                  instanceId: latestResolvedInstance.instanceId.toString()
              }
            : null
    }
}

async function getFloodgatesPGCR(): Promise<FloodgatesStatus> {
    const getLatestUnblockedInstance = async () => {
        const latestInstanceId = await getFloodgatesRecentId()

        if (!latestInstanceId) {
            return null
        }

        const instance = await getInstanceBasic(latestInstanceId)
        if (!instance) {
            return null
        }

        return {
            instanceId: instance.instanceId.toString(),
            dateCompleted: instance.dateCompleted,
            dateResolved: instance.dateResolved
        }
    }

    const [latestResolvedInstance, floodgatesStatus] = await Promise.all([
        getLatestUnblockedInstance(),
        getFloodgatesStatus()
    ])

    const backlog = floodgatesStatus.waiting

    const emptyRate = floodgatesStatus.ackRateSeconds - floodgatesStatus.ingressRateSeconds
    const estimatedBacklogEmptied =
        emptyRate < 0 || backlog === 0 ? null : new Date(Date.now() + (backlog / emptyRate) * 1000)

    let status: FloodgatesStatus["status"] = "Empty"
    if (backlog > 100) {
        status = floodgatesStatus.ackRateSeconds > 0.05 ? "Crawling" : "Blocked"
    } else if (backlog > 0) {
        status =
            floodgatesStatus.ackRateSeconds > 0.05 && floodgatesStatus.ingressRateSeconds > 0
                ? "Live"
                : "Blocked"
    } else if (
        backlog === 0 &&
        floodgatesStatus.ackRateSeconds > 0 &&
        floodgatesStatus.ingressRateSeconds > 0
    ) {
        status = "Live"
    }

    return {
        status: status,
        incomingRate: floodgatesStatus.ingressRateSeconds,
        resolveRate: floodgatesStatus.ackRateSeconds,
        backlog: backlog,
        latestResolvedInstance: latestResolvedInstance,
        estimatedBacklogEmptied
    }
}
