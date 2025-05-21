import { registry } from "@/schema/registry"
import { zISODateString, zNaturalNumber, zUInt32 } from "@/schema/util"
import { z } from "zod"

export type ActivityDefinition = z.input<typeof zActivityDefinition>
export const zActivityDefinition = registry.register(
    "ActivityDefinition",
    z
        .object({
            id: zNaturalNumber(),
            name: z.string(),
            path: z.string(),
            isSunset: z.boolean(),
            isRaid: z.boolean(),
            releaseDate: zISODateString({ nullable: true }),
            dayOneEnd: zISODateString({ nullable: true }),
            contestEnd: zISODateString({ nullable: true }),
            weekOneEnd: zISODateString({ nullable: true }),
            milestoneHash: zUInt32().nullable()
        })
        .strict()
        .openapi({
            description: "The definition of an activity in the RaidHub database.",
            example: {
                id: 9,
                name: "Vault of Glass",
                path: "vaultofglass",
                isSunset: false,
                isRaid: true,
                releaseDate: new Date("2021-05-22T00:00:00Z"),
                dayOneEnd: new Date("2021-05-23T00:00:00Z"),
                contestEnd: new Date("2021-05-23T00:00:00Z"),
                weekOneEnd: new Date("2021-05-25T00:00:00Z"),
                milestoneHash: 1888320892
            }
        })
)
