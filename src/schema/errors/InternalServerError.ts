import { registerError } from "@/core/RaidHubResponse"
import { z } from "zod"
import { ErrorCode } from "./ErrorCode"

export type InternalServerError = z.input<typeof zInternalServerError>
export const zInternalServerError = registerError(
    ErrorCode.InternalServerError,
    z.object({
        message: z.string()
    })
)
