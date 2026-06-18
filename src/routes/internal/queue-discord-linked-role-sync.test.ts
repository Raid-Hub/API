import { expectErr, expectOk } from "@/lib/test-utils"
import * as enqueue from "@/services/discord-linked-roles/enqueue-manual-sync"
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test"
import { queueDiscordLinkedRoleSyncRoute } from "./queue-discord-linked-role-sync"

describe("queueDiscordLinkedRoleSyncRoute", () => {
    let clientSecret: string | undefined

    beforeEach(() => {
        clientSecret = process.env.CLIENT_SECRET
        process.env.CLIENT_SECRET = "test-client-secret"
    })

    afterEach(() => {
        if (clientSecret === undefined) {
            Reflect.deleteProperty(process.env, "CLIENT_SECRET")
        } else {
            process.env.CLIENT_SECRET = clientSecret
        }
    })

    test("403 when header secret wrong", async () => {
        const result = await queueDiscordLinkedRoleSyncRoute.$mock({
            body: { destinyMembershipIds: ["4611686018427387905"] },
            headers: { "x-raidhub-client-secret": "wrong" }
        })
        expectErr(result)
    })

    test("500 when CLIENT_SECRET unset", async () => {
        Reflect.deleteProperty(process.env, "CLIENT_SECRET")
        const result = await queueDiscordLinkedRoleSyncRoute.$mock({
            body: { destinyMembershipIds: ["4611686018427387905"] },
            headers: { "x-raidhub-client-secret": "x" }
        })
        expectErr(result)
        process.env.CLIENT_SECRET = "test-client-secret"
    })

    test("200 when enqueue succeeds", async () => {
        const spy = spyOn(enqueue, "enqueueManualLinkedRoleSync").mockResolvedValue({
            ok: true,
            destinyMembershipIds: ["4611686018427387905"]
        })
        const result = await queueDiscordLinkedRoleSyncRoute.$mock({
            body: { destinyMembershipIds: ["4611686018427387905"] },
            headers: { "x-raidhub-client-secret": "test-client-secret" }
        })
        expectOk(result)
        if (result.type === "ok") {
            expect(result.parsed).toEqual({
                queued: true,
                destinyMembershipIds: ["4611686018427387905"]
            })
        }
        spy.mockRestore()
    })

    test("503 when enqueue disabled", async () => {
        const spy = spyOn(enqueue, "enqueueManualLinkedRoleSync").mockResolvedValue({
            ok: false,
            reason: "disabled"
        })
        const result = await queueDiscordLinkedRoleSyncRoute.$mock({
            body: { destinyMembershipIds: ["4611686018427387905"] },
            headers: { "x-raidhub-client-secret": "test-client-secret" }
        })
        expectErr(result)
        spy.mockRestore()
    })

    test("503 when enqueue buffer full", async () => {
        const spy = spyOn(enqueue, "enqueueManualLinkedRoleSync").mockResolvedValue({
            ok: false,
            reason: "buffer_full"
        })
        const result = await queueDiscordLinkedRoleSyncRoute.$mock({
            body: { destinyMembershipIds: ["4611686018427387905"] },
            headers: { "x-raidhub-client-secret": "test-client-secret" }
        })
        expectErr(result)
        spy.mockRestore()
    })

    test("500 when publish fails", async () => {
        const spy = spyOn(enqueue, "enqueueManualLinkedRoleSync").mockResolvedValue({
            ok: false,
            reason: "publish_failed"
        })
        const result = await queueDiscordLinkedRoleSyncRoute.$mock({
            body: { destinyMembershipIds: ["4611686018427387905"] },
            headers: { "x-raidhub-client-secret": "test-client-secret" }
        })
        expectErr(result)
        spy.mockRestore()
    })
})
