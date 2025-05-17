import { registry } from "@/schema"
import { ZodNativeEnumDef, ZodType, z } from "zod"

/**
 * Subset of BungieMembershipType.
 * @see {@link https://bungie-net.github.io/#/components/schemas/BungieMembershipType}
 */
export enum DestinyMembershipType {
    None = 0,
    Xbox = 1,
    Psn = 2,
    Steam = 3,
    Blizzard = 4,
    Stadia = 5,
    Epic = 6,
    /**
     * "All" is only valid for searching capabilities
     */
    All = -1
}

export const zDestinyMembershipType = registry.register(
    "DestinyMembershipType",
    (
        z.nativeEnum(DestinyMembershipType) as ZodType<
            (typeof DestinyMembershipType)[keyof typeof DestinyMembershipType],
            ZodNativeEnumDef<typeof DestinyMembershipType>,
            number
        >
    ).openapi({
        externalDocs: {
            url: "https://bungie-net.github.io/#/components/schemas/BungieMembershipType"
        }
    })
)
