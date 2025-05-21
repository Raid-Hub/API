import { registerError } from "@/core/RaidHubResponse"
import { z } from "zod"
import { ErrorCode } from "./ErrorCode"

export type ApiKeyError = z.input<typeof zApiKeyError>
export const zApiKeyError = registerError(
    ErrorCode.ApiKeyError,
    z.object({
        message: z.union([z.literal("Invalid API Key"), z.literal("Missing API Key")]),
        apiKey: z.string().nullable(),
        origin: z.string().nullable()
    })
)
