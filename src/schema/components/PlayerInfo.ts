import { zDestinyMembershipType } from "@/schema/enums/DestinyMembershipType"
import { registry } from "@/schema/registry"
import { zInt64, zISODateString } from "@/schema/util"
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
            lastSeen: zISODateString(),
            isPrivate: z.boolean().openapi({
                description: "Whether or not the player has chosen to hide their on Bungie.net."
            })
        })
        .openapi({
            example: {
                bungieGlobalDisplayName: "Newo",
                bungieGlobalDisplayNameCode: "9010",
                membershipId: "4611686018488107374",
                displayName: "xx_newo_xx",
                iconPath: "/common/destiny2_content/icons/93844c8b76ea80683a880479e3506980.jpg",
                membershipType: 3,
                lastSeen: new Date("2021-05-01T00:00:00.000Z"),
                isPrivate: false
            }
        })
        .strict()
)
