import { expectErr, expectOk } from "@/lib/test-utils"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { describe, expect, test } from "bun:test"
import { reportingStandingInstanceRoute } from "@/routes/admin/reporting/instance-standing"

describe("instance standing 200", () => {
    const t = async (instanceId: string) => {
        const result = await reportingStandingInstanceRoute.$mock({ params: { instanceId } })

        expectOk(result)
    }

    test("normal", () => t("16164452822"))
})

describe("instance standing not found", () => {
    const t = async (instanceId: string) => {
        const result = await reportingStandingInstanceRoute.$mock({
            params: {
                instanceId
            }
        })

        expectErr(result)
        if (result.type === "err") {
            expect(result.code).toBe(ErrorCode.InstanceNotFoundError)
        }
    }

    test("fake id", () => t("1006164452822"))
})
