import { ErrorCode } from "@/schema/errors/ErrorCode"
import { expect } from "bun:test"

export const expectOk = <
    R,
    T extends
        | {
              type: "ok"
              parsed: R
          }
        | {
              type: "err"
              code: ErrorCode
              parsed: unknown
          }
>(
    result: T
) => {
    if (result.type === "err") {
        expect(result.parsed).toBe(null)
    }
    expect(result.type).toBe("ok")
}

export const expectErr = <
    E,
    T extends
        | {
              type: "ok"
              parsed: unknown
          }
        | {
              type: "err"
              code: ErrorCode
              parsed: readonly E[]
          }
>(
    result: T
) => {
    if (result.type === "ok") {
        expect(result.parsed).toBe(null)
    }
    expect(result.type).toBe("err")
}
