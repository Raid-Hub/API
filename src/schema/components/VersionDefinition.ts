import { zNaturalNumber } from "@/schema/output"
import { registry } from "@/schema/registry"
import { z } from "zod"

export type VersionDefinition = z.input<typeof zVersionDefinition>
export const zVersionDefinition = registry.register(
    "VersionDefinition",
    z
        .object({
            id: zNaturalNumber(),
            name: z.string(),
            path: z.string(),
            associatedActivityId: zNaturalNumber().nullable(),
            isChallengeMode: z.boolean()
        })
        .strict()
        .openapi({
            description: "The definition of a version in the RaidHub database.",
            examples: [
                {
                    id: 1,
                    name: "Standard",
                    path: "normal",
                    associatedActivityId: null,
                    isChallengeMode: false
                },
                {
                    id: 129,
                    name: "Oryx Exalted",
                    path: "oryx",
                    associatedActivityId: 101,
                    isChallengeMode: false
                },
                {
                    id: 132,
                    name: "Calus Resplendent",
                    path: "calus",
                    associatedActivityId: 102,
                    isChallengeMode: false
                },
                {
                    id: 133,
                    name: "Morgeth Surpassing",
                    path: "morgeth",
                    associatedActivityId: 102,
                    isChallengeMode: false
                }
            ]
        })
)
