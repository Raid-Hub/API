import { registerError } from "@/core/RaidHubResponse"
import { z } from "zod"
import { ErrorCode } from "./ErrorCode"

export type InvalidDiscordAuthError = z.input<typeof zInvalidDiscordAuthError>
export const zInvalidDiscordAuthError = registerError(
    ErrorCode.InvalidDiscordAuthError,
    z.object({
        message: z.literal("Invalid Discord context token")
    })
)
