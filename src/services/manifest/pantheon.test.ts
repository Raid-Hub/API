import {
    getPantheonActivityIds,
    getPantheonVersionIds,
    sortPantheonActivityIds
} from "@/services/manifest/pantheon"
import { describe, expect, test } from "bun:test"

const pantheonActivity = {
    isRaid: false,
    releaseDate: null,
    dayOneEnd: null,
    contestEnd: null,
    weekOneEnd: null,
    milestoneHash: null,
    splashSlug: "pantheon"
} as const

describe("getPantheonActivityIds", () => {
    test("returns activities with pantheon or legacy thepantheon paths", () => {
        expect(
            getPantheonActivityIds([
                {
                    id: 9,
                    name: "Vault of Glass",
                    path: "vaultofglass",
                    isSunset: false,
                    isRaid: true,
                    releaseDate: null,
                    dayOneEnd: null,
                    contestEnd: null,
                    weekOneEnd: null,
                    milestoneHash: null,
                    splashSlug: "vog"
                },
                {
                    id: 101,
                    name: "The Pantheon",
                    path: "thepantheon",
                    isSunset: true,
                    ...pantheonActivity
                },
                {
                    id: 102,
                    name: "The Pantheon",
                    path: "pantheon",
                    isSunset: false,
                    ...pantheonActivity
                }
            ])
        ).toEqual([101, 102])
    })
})

describe("sortPantheonActivityIds", () => {
    test("lists active pantheon activities before sunset activities", () => {
        expect(
            sortPantheonActivityIds(
                [
                    {
                        id: 101,
                        name: "The Pantheon",
                        path: "thepantheon",
                        isSunset: true,
                        ...pantheonActivity
                    },
                    {
                        id: 102,
                        name: "The Pantheon",
                        path: "pantheon",
                        isSunset: false,
                        ...pantheonActivity
                    }
                ],
                [101, 102]
            )
        ).toEqual([102, 101])
    })
})

describe("getPantheonVersionIds", () => {
    test("splits active and sunset pantheon versions", () => {
        expect(
            getPantheonVersionIds(
                [
                    {
                        id: 128,
                        name: "Atraks Sovereign",
                        path: "atraks",
                        associatedActivityId: 101,
                        isChallengeMode: false
                    },
                    {
                        id: 132,
                        name: "Calus Resplendent",
                        path: "calus-resplendent",
                        associatedActivityId: 102,
                        isChallengeMode: false
                    },
                    {
                        id: 135,
                        name: "Argos",
                        path: "argos",
                        associatedActivityId: 102,
                        isChallengeMode: false
                    }
                ],
                [102, 101],
                [
                    {
                        id: 101,
                        name: "The Pantheon",
                        path: "thepantheon",
                        isSunset: true,
                        ...pantheonActivity
                    },
                    {
                        id: 102,
                        name: "The Pantheon",
                        path: "pantheon",
                        isSunset: false,
                        ...pantheonActivity
                    }
                ]
            )
        ).toEqual({
            pantheonVersionIds: [132, 135],
            pantheonSunsetVersionIds: [128]
        })
    })
})
