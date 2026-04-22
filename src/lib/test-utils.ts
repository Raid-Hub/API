import "@/lib/extensions"
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
              parsed: E
          }
>(
    result: T
) => {
    expect(result.type).toBe("err")
}
