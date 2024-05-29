import { DestinyActivityModeType } from "bungie-net-core/enums"
import { z } from "zod"
import { registry } from ".."
import { zDestinyMembershipType } from "../enums/DestinyMembershipType"
import { zBigIntString, zISODateString } from "../util"

export type RaidHubPostGameCarnageReport = z.infer<typeof zRaidHubPostGameCarnageReport>

const zDestinyHistoricalStatsValuePair = z
    .object({
        basic: z
            .object({
                value: z.number(),
                displayValue: z.string()
            })
            .strip()
    })
    .strip()

export const zRaidHubPostGameCarnageReport = registry.register(
    "RaidHubPostGameCarnageReport",
    z
        .object({
            period: zISODateString(),
            startingPhaseIndex: z.number().optional(),
            activityWasStartedFromBeginning: z.boolean().optional(),
            activityDetails: z
                .object({
                    directorActivityHash: zBigIntString(),
                    instanceId: zBigIntString(),
                    mode: z.nativeEnum(DestinyActivityModeType),
                    modes: z.array(z.nativeEnum(DestinyActivityModeType)),
                    membershipType: zDestinyMembershipType
                })
                .strip(),
            entries: z.array(
                z
                    .object({
                        player: z
                            .object({
                                destinyUserInfo: z
                                    .object({
                                        iconPath: z.string().nullable().optional(),
                                        crossSaveOverride: zDestinyMembershipType,
                                        applicableMembershipTypes: z
                                            .array(zDestinyMembershipType)
                                            .nullable()
                                            .optional(),
                                        membershipType: zDestinyMembershipType
                                            .nullable()
                                            .optional(),
                                        membershipId: z.string(),
                                        displayName: z.string().nullable().optional(),
                                        bungieGlobalDisplayName: z.string().nullable().optional(),
                                        bungieGlobalDisplayNameCode: z
                                            .number()
                                            .nullable()
                                            .optional()
                                    })
                                    .strip(),
                                characterClass: z.string().nullable().optional(),
                                classHash: z.number(),
                                raceHash: z.number(),
                                genderHash: z.number(),
                                characterLevel: z.number(),
                                lightLevel: z.number(),
                                emblemHash: z.number()
                            })
                            .strip(),
                        characterId: z.string(),
                        values: z.record(zDestinyHistoricalStatsValuePair),
                        extended: z
                            .object({
                                weapons: z
                                    .array(
                                        z
                                            .object({
                                                referenceId: z.number(),
                                                values: z.record(zDestinyHistoricalStatsValuePair)
                                            })
                                            .strip()
                                    )
                                    .nullable()
                                    .optional(),
                                values: z.record(zDestinyHistoricalStatsValuePair)
                            })
                            .strip()
                            .optional()
                    })
                    .strip()
            )
        })
        .strip()
        .openapi({
            description: "A raw PGCR with a few redundant fields removed",
            externalDocs: {
                description: "Bungie.net API documentation",
                url: "https://bungie-net.github.io/multi/schema_Destiny-HistoricalStats-DestinyPostGameCarnageReportData.html#schema_Destiny-HistoricalStats-DestinyPostGameCarnageReportData"
            }
        })
)
