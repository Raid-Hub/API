import * as bungie from "@/integrations/bungie"
import { BungieApiError } from "@/integrations/bungie"
import { expectErr, expectOk } from "@/lib/test-utils"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { afterAll, describe, expect, spyOn, test } from "bun:test"
import { PlatformErrorCodes } from "bungie-net-core/enums"
import { clanBasicRoute } from "./basic"

describe("clan basic", () => {
    const spyGetClan = spyOn(bungie, "getClan")

    afterAll(() => {
        spyGetClan.mockRestore()
    })

    test("returns identity fields", async () => {
        spyGetClan.mockResolvedValue({
            detail: {
                groupId: "49271161",
                name: "Example Clan",
                groupType: 1,
                membershipIdCreated: "1",
                creationDate: "",
                modificationDate: "",
                about: "",
                tags: [],
                memberCount: 1,
                isPublic: true,
                isPublicTopicAdminOnly: false,
                motto: "We raid",
                allowChat: true,
                isDefaultPostPublic: true,
                chatSecurity: 0,
                locale: "en",
                avatarImageIndex: 0,
                homepage: 0,
                membershipOption: 0,
                defaultPublicity: 0,
                theme: "",
                bannerPath: "",
                avatarPath: "/img/clan.jpg",
                conversationId: "",
                enableInvitationMessagingForAdmins: false,
                features: {} as never,
                clanInfo: {
                    d2ClanProgressions: {},
                    clanCallsign: "EXM",
                    clanBannerData: {} as never
                }
            }
        } as never)

        const result = await clanBasicRoute.$mock({ params: { groupId: "49271161" } })
        expectOk(result)
        if (result.type === "ok") {
            expect(result.parsed.name).toBe("Example Clan")
            expect(result.parsed.callSign).toBe("EXM")
            expect(result.parsed.avatarPath).toBe("/img/clan.jpg")
            expect(String(result.parsed.groupId)).toBe("49271161")
        }
    })

    test("returns ClanNotFound when clan is missing", async () => {
        spyGetClan.mockResolvedValue(null as never)

        const result = await clanBasicRoute.$mock({ params: { groupId: "49271161" } })
        expectErr(result)
        if (result.type === "err") {
            expect(result.code).toBe(ErrorCode.ClanNotFound)
        }
    })

    test("maps SystemDisabled to BungieServiceOffline", async () => {
        spyGetClan.mockRejectedValue(
            new BungieApiError({
                cause: {
                    ErrorCode: PlatformErrorCodes.SystemDisabled,
                    Message: "System Disabled",
                    ThrottleSeconds: 0,
                    Response: undefined,
                    ErrorStatus: "",
                    MessageData: {},
                    DetailedErrorTrace: ""
                },
                url: new URL("http://localhost/mocked")
            })
        )

        const result = await clanBasicRoute.$mock({ params: { groupId: "49271161" } })
        expectErr(result)
        if (result.type === "err") {
            expect(result.code).toBe(ErrorCode.BungieServiceOffline)
        }
    })
})
