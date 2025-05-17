import { expectOk } from "@/test"
import { test } from "bun:test"
import { manifestRoute } from "./manifest"

test("manifest 200", async () => {
    const result = await manifestRoute.$mock()

    expectOk(result)
})
