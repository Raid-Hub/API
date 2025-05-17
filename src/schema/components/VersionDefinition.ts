import { registry } from "@/schema"
import { zNaturalNumber } from "@/schema/util"
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
                }
            ]
        })
)
