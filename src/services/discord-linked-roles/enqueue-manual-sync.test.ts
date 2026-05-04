import { discordRoleMetadataSyncQueue } from "@/integrations/rabbitmq/queues"
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test"
import { enqueueManualLinkedRoleSync } from "./enqueue-manual-sync"

describe("enqueueManualLinkedRoleSync", () => {
    let prevEnabled: string | undefined

    beforeEach(() => {
        prevEnabled = process.env.DISCORD_LINKED_ROLES_ENABLED
    })

    afterEach(() => {
        if (prevEnabled === undefined) {
            delete process.env.DISCORD_LINKED_ROLES_ENABLED
        } else {
            process.env.DISCORD_LINKED_ROLES_ENABLED = prevEnabled
        }
    })

    test("disabled when env unset", async () => {
        delete process.env.DISCORD_LINKED_ROLES_ENABLED
        const r = await enqueueManualLinkedRoleSync(["4611686018427387905"])
        expect(r).toEqual({ ok: false, reason: "disabled" })
    })

    test("disabled when env false", async () => {
        process.env.DISCORD_LINKED_ROLES_ENABLED = "false"
        const r = await enqueueManualLinkedRoleSync(["4611686018427387905"])
        expect(r).toEqual({ ok: false, reason: "disabled" })
    })

    test("publish_failed when id list empty", async () => {
        process.env.DISCORD_LINKED_ROLES_ENABLED = "true"
        const r = await enqueueManualLinkedRoleSync([])
        expect(r).toEqual({ ok: false, reason: "publish_failed" })
    })

    test("buffer_full when queue returns false", async () => {
        process.env.DISCORD_LINKED_ROLES_ENABLED = "true"
        const spy = spyOn(discordRoleMetadataSyncQueue, "sendJson").mockResolvedValue(
            false as never
        )
        const r = await enqueueManualLinkedRoleSync(["4611686018427387905"])
        expect(r).toEqual({ ok: false, reason: "buffer_full" })
        spy.mockRestore()
    })

    test("ok when queue accepts message", async () => {
        process.env.DISCORD_LINKED_ROLES_ENABLED = "true"
        const spy = spyOn(discordRoleMetadataSyncQueue, "sendJson").mockResolvedValue(true as never)
        const ids = ["4611686018427387905"]
        const r = await enqueueManualLinkedRoleSync(ids)
        expect(r).toEqual({ ok: true, destinyMembershipIds: ids })
        expect(spy).toHaveBeenCalledWith({
            trigger: "account_linked_roles_sync",
            destinyMembershipIds: ids,
            instanceId: 0
        })
        spy.mockRestore()
    })

    test("publish_failed when sendJson throws", async () => {
        process.env.DISCORD_LINKED_ROLES_ENABLED = "true"
        const spy = spyOn(discordRoleMetadataSyncQueue, "sendJson").mockRejectedValue(
            new Error("amqp down")
        )
        const r = await enqueueManualLinkedRoleSync(["4611686018427387905"])
        expect(r).toEqual({ ok: false, reason: "publish_failed" })
        spy.mockRestore()
    })
})
