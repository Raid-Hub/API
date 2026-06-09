import {
    GAUNTLET_VERSION_PATH,
    getGauntletVersionIds,
    getPantheonActivityIds,
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

    test("returns activities with pantheon path", () => {

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
                    path: "pantheon",
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
                        path: "pantheon",
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

describe("getGauntletVersionIds", () => {
    test("returns gauntlet versions associated with pantheon activities", () => {

        expect(

            getGauntletVersionIds(

                [

                    {

                        id: 129,

                        name: "Oryx Exalted",

                        path: "oryx",

                        associatedActivityId: 101,

                        isChallengeMode: false

                    },

                    {

                        id: 134,

                        name: "Pantheon Gauntlet",

                        path: GAUNTLET_VERSION_PATH,

                        associatedActivityId: 102,

                        isChallengeMode: false

                    }

                ],

                [101, 102]

            )

        ).toEqual([134])

    })

})


