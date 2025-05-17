import { RaidHubRoute } from "@/RaidHubRoute"
import { listActivityDefinitions, listHashes, listVersionDefinitions } from "@/data/definitions"
import { cacheControl } from "@/middlewares/cache-control"
import { zActivityDefinition } from "@/schema/components/ActivityDefinition"
import { zVersionDefinition } from "@/schema/components/VersionDefinition"
import { zNaturalNumber, zNumericalRecordKey } from "@/schema/util"
import { z } from "zod"

export const manifestRoute = new RaidHubRoute({
    method: "get",
    description: `The RaidHub manifest provides definitions for all activities and versions in the RaidHub database.`,
    middleware: [cacheControl(30)],
    response: {
        success: {
            statusCode: 200,
            schema: z
                .object({
                    hashes: z
                        .record(
                            zNumericalRecordKey("uint32"),
                            z.object({
                                activityId: zNaturalNumber(),
                                versionId: zNaturalNumber()
                            })
                        )
                        .openapi({
                            description:
                                "The mapping of each Bungie.net hash to a RaidHub activityId and versionId"
                        }),
                    activityDefinitions: z
                        .record(zNumericalRecordKey(), zActivityDefinition)
                        .openapi({
                            description: "The mapping of each RaidHub activityId to its definition"
                        }),
                    versionDefinitions: z
                        .record(zNumericalRecordKey(), zVersionDefinition)
                        .openapi({
                            description: "The mapping of each RaidHub versionId to its definition"
                        }),
                    listedRaidIds: z
                        .array(zNaturalNumber())
                        .openapi({
                            description: "The list of all activityId in order of newest to oldest"
                        })
                        .min(8),
                    sunsetRaidIds: z.array(zNaturalNumber()).openapi({
                        description: "The list of inactive raid activityId"
                    }),
                    prestigeRaidIds: z
                        .array(zNaturalNumber())
                        .openapi({
                            description: "The list of raid activityId which had a prestige mode"
                        })
                        .min(3),
                    masterRaidIds: z
                        .array(zNaturalNumber())
                        .openapi({
                            description: "The list of raid activityId which have a master mode"
                        })
                        .min(5),
                    contestRaidIds: z
                        .array(zNaturalNumber())
                        .openapi({
                            description: "The list of raid activityId which had a contest mode"
                        })
                        .min(8),
                    resprisedRaidIds: z.array(zNaturalNumber()).min(3).openapi({
                        description:
                            "The list of raid activityId which have been reprised from Destiny 1"
                    }),
                    resprisedChallengeVersionIds: z.array(zNaturalNumber()).min(3).openapi({
                        description:
                            "The list of version versionId which are the challenge mode for reprised raids"
                    }),
                    pantheonIds: z
                        .array(zNaturalNumber())
                        .openapi({
                            description: "The list of activityId for Pantheon"
                        })
                        .min(1),
                    versionsForActivity: z.record(z.array(zNaturalNumber()).min(1)).openapi({
                        description: "The set of versionId for each activityId"
                    })
                })
                .strict()
        }
    },
    handler: async () => {
        const [activities, versions, hashes] = await Promise.all([
            listActivityDefinitions(),
            listVersionDefinitions(),
            listHashes()
        ])
        const raids = activities.filter(a => a.isRaid)
        const pantheonId = 101
        const versionsSetForActivity: Record<number, Set<number>> = {}
        for (const { activityId, versionId } of hashes) {
            if (!versionsSetForActivity[activityId]) {
                versionsSetForActivity[activityId] = new Set()
            }
            versionsSetForActivity[activityId].add(versionId)
        }
        const versionsForActivity: Record<number, number[]> = {}
        Object.entries(versionsSetForActivity).forEach(([activityId, set]) => {
            versionsForActivity[parseInt(activityId)] = [...set]
        })

        return RaidHubRoute.ok({
            hashes: Object.fromEntries(
                hashes.map(h => [
                    h.hash,
                    {
                        activityId: h.activityId,
                        versionId: h.versionId
                    }
                ])
            ),
            activityDefinitions: Object.fromEntries(activities.map(data => [data.id, data])),
            versionDefinitions: Object.fromEntries(versions.map(data => [data.id, data])),
            listedRaidIds: raids
                .sort((a, b) => {
                    if (+a.isSunset ^ +b.isSunset) {
                        return a.isSunset ? 1 : -1
                    } else {
                        return b.id - a.id
                    }
                })
                .map(a => a.id),
            sunsetRaidIds: raids.filter(a => a.isSunset).map(a => a.id),
            prestigeRaidIds: [
                ...new Set(hashes.filter(h => h.versionId === 3).map(h => h.activityId))
            ],
            masterRaidIds: [
                ...new Set(hashes.filter(h => h.versionId === 4).map(h => h.activityId))
            ],
            contestRaidIds: raids.filter(a => a.contestEnd !== null).map(a => a.id),
            resprisedRaidIds: versions
                .filter(v => v.associatedActivityId && v.associatedActivityId < 100)
                .map(a => a.associatedActivityId!),
            resprisedChallengeVersionIds: versions.filter(v => v.isChallengeMode).map(v => v.id),
            pantheonIds: [pantheonId],
            versionsForActivity: versionsForActivity
        })
    }
})
