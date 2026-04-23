import { DestinyMembershipType } from "@/schema/enums/DestinyMembershipType"
import { gzipSync } from "bun"
import { DestinyActivityModeType } from "bungie-net-core/enums"

/** Minimal JSON that satisfies `zRaidHubPostGameCarnageReport` after route coercion. */
export function buildMinimalRaidHubPgcrJson(instanceId: string) {
    return {
        period: "2023-06-01T12:00:00.000Z",
        activityDetails: {
            directorActivityHash: 4022717370,
            instanceId,
            mode: DestinyActivityModeType.Raid,
            modes: [DestinyActivityModeType.Raid],
            membershipType: DestinyMembershipType.Steam
        },
        entries: [
            {
                player: {
                    destinyUserInfo: {
                        crossSaveOverride: DestinyMembershipType.None,
                        membershipId: "4611686019000000701"
                    },
                    classHash: 2271682552,
                    raceHash: 3887374342,
                    genderHash: 3111576190,
                    characterLevel: 50,
                    lightLevel: 1810,
                    emblemHash: 144553681
                },
                characterId: "2345678901234567890",
                values: {}
            }
        ]
    }
}

export function gzipPgcrJson(instanceId: string): Buffer {
    return Buffer.from(
        gzipSync(Buffer.from(JSON.stringify(buildMinimalRaidHubPgcrJson(instanceId))))
    )
}
