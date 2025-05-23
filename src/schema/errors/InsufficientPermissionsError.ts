import { registerError } from "@/core/RaidHubResponse"
import { z } from "zod"
import { ErrorCode } from "./ErrorCode"

export type InsufficientPermissionsError = z.input<typeof zInsufficientPermissionsError>
export const zInsufficientPermissionsError = registerError(
    ErrorCode.InsufficientPermissionsError,
    z.object({
        message: z.literal("Forbidden")
    })
)
