import { registerError } from "@/core/RaidHubResponse"
import { z } from "zod"
import { ErrorCode } from "./ErrorCode"
import { zZodIssue } from "./ZodIssue"

export type BodyValidationError = z.input<typeof zBodyValidationError>
export const zBodyValidationError = registerError(
    ErrorCode.BodyValidationError,
    z.object({
        issues: z.array(zZodIssue)
    })
)
