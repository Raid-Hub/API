import { describe, expect, test } from "bun:test"
import { sqlIsDayOne } from "@/services/instance/is-day-one"

describe("sqlIsDayOne", () => {
    test("uses version release date for pantheon activities", () => {
        expect(sqlIsDayOne("instance")).toContain("activity_definition.path = 'pantheon'")
        expect(sqlIsDayOne("instance")).toContain("av.release_date_override")
    })

    test("uses activity day_one_end for non-pantheon activities", () => {
        expect(sqlIsDayOne("fastest")).toContain("activity_definition.day_one_end")
    })
})
