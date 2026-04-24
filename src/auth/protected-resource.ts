import { Logger } from "@/lib/utils/logging"
import { JWTAuthContext } from "./jwt"

const logger = new Logger("API_AUTH_SERVICE")

export const canAccessProtectedResource = async (
    destinyMembershipId: string | bigint,
    auth: JWTAuthContext | undefined
) => {
    if (!auth) return false

    try {
        return auth.isAdmin || auth.destinyMembershipIds.includes(String(destinyMembershipId))
    } catch (err) {
        logger.warn(
            "JWT_VERIFICATION_FAILED",
            err instanceof Error ? err : new Error(String(err)),
            {
                operation: "verify_token",
                membership_id: String(destinyMembershipId)
            }
        )
        return false
    }
}
