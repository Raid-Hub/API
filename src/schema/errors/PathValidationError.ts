import { registerError } from "@/core/RaidHubResponse"
import { z } from "zod"
import { ErrorCode } from "./ErrorCode"
import { zZodIssue } from "./ZodIssue"

export type PathValidationError = z.input<typeof zPathValidationError>
export const zPathValidationError = registerError(
    ErrorCode.PathValidationError,
    z.object({
        issues: z.array(zZodIssue)
    })
)
