import { cleanupPostgresAfterAll, expectOk } from "../testUtil"
import { playerSearchRoute } from "./search"

cleanupPostgresAfterAll()

describe("player search 200", () => {
    const t = async (query: unknown) => {
        const result = await playerSearchRoute.$mock({ query })

        expectOk(result)

        return result.parsed
    }

    test("partial display name", async () => {
        const data = await t({
            query: "New",
            count: 19,
            membershipType: -1,
            global: true
        })

        expect(data.results.length).toBeGreaterThan(5)
    })

    test("display name", () =>
        t({
            query: "Newo",
            count: 3,
            membershipType: 2,
            global: false
        }))

    test("partial bungie name", () =>
        t({
            query: "Newo#90",
            global: true
        }))

    test("no raidhub results global", () =>
        t({
            query: "lafoasdfasmfahffjfa#9999",
            global: true
        }))

    test("no raidhub results display", () =>
        t({
            query: "lafoasdfasmfahffjfa",
            global: false
        }))

    test("full bungie name", async () => {
        const data = await t({
            query: "Newo#9010",
            count: 23
        })

        expect(data.results).toHaveLength(1)
    })

    test("full bungie name wrong platform", async () => {
        const data = await t({
            query: "Newo#9010",
            membershipType: 2,
            count: 1
        })

        expect(data.results).toHaveLength(0)
    })
})
