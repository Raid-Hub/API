import { getPantheonActivityIds, sortPantheonActivityIds } from "@/services/manifest/pantheon"
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
    test("returns activities with pantheon paths", () => {
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
                    name: "Pantheon",
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
                        name: "Pantheon",
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
