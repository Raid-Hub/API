import { timingSafeEqual } from "node:crypto"

/** Constant-time string compare for secrets (length mismatch returns false without throwing). */
export function timingSafeStringEqual(
    expected: string | undefined,
    candidate: string | undefined
): boolean {
    if (expected === undefined || candidate === undefined) {
        return false
    }
    const a = Buffer.from(expected, "utf8")
    const b = Buffer.from(candidate, "utf8")
    if (a.length !== b.length) {
        return false
    }
    return timingSafeEqual(a, b)
}
