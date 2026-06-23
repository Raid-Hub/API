import { buildMinimalRaidHubPgcrJson, gzipPgcrJson } from "@/lib/test-minimal-pgcr"
import { describe, expect, test } from "bun:test"
import { decodePgcrPayload } from "./pgcr"

describe("decodePgcrPayload", () => {
    const instanceId = "999000000704"

    test("decodes gzip-compressed JSON", () => {
        const json = decodePgcrPayload(gzipPgcrJson(instanceId))
        expect(JSON.parse(json).activityDetails.instanceId).toBe(instanceId)
    })

    test("decodes plain JSON", () => {
        const plain = Buffer.from(JSON.stringify(buildMinimalRaidHubPgcrJson(instanceId)))
        const json = decodePgcrPayload(plain)
        expect(JSON.parse(json).activityDetails.instanceId).toBe(instanceId)
    })
})
