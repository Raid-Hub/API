import { zCheatLevel } from "@/schema/enums/CheatLevel"
import { zDestinyMembershipType } from "@/schema/enums/DestinyMembershipType"
import { zInt64, zISO8601DateString } from "@/schema/output"
import { registry } from "@/schema/registry"
import { z } from "zod"

export type PlayerInfo = z.input<typeof zPlayerInfo>
export const zPlayerInfo = registry.register(
    "PlayerInfo",
    z
        .object({
            membershipId: zInt64(),
            membershipType: zDestinyMembershipType.nullable().openapi({
                param: {
                    schema: {
                        nullable: true
                    }
                },
                description: "The platform on which the player created their account."
            }),
            iconPath: z.string().nullable(),
            displayName: z.string().nullable().openapi({
                description:
                    "The platform-specific display name of the player. No longer shown in-game."
            }),
            bungieGlobalDisplayName: z.string().nullable(),
            bungieGlobalDisplayNameCode: z.string().nullable(),
            lastSeen: zISO8601DateString(),
            isPrivate: z.boolean().openapi({
                description: "Whether or not the player has chosen to hide their on Bungie.net."
            }),
            cheatLevel: zCheatLevel
        })
        .openapi({
            example: {
                bungieGlobalDisplayName: "Newo",
                bungieGlobalDisplayNameCode: "9010",
                membershipId: 4611686018488107374n,
                displayName: "xx_newo_xx",
                iconPath: "/common/destiny2_content/icons/93844c8b76ea80683a880479e3506980.jpg",
                membershipType: 3,
                lastSeen: new Date("2021-05-01T00:00:00.000Z"),
                isPrivate: false,
                cheatLevel: 0
            }
        })
        .strict()
)
