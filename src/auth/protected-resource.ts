import { Logger } from "@/lib/utils/logging"
import jwt from "jsonwebtoken"
import { zJWTAuthFormat } from "./jwt"

const logger = new Logger("API_AUTH_SERVICE")

export const canAccessProtectedResource = async (
    destinyMembershipId: string | bigint,
    authHeader: string
) => {
    if (!authHeader) return false

    const [format, token] = authHeader ? authHeader.split(" ") : ["", ""]
    if (format !== "Bearer" || !token) return false

    try {
        return await new Promise<boolean>(resolve =>
            jwt.verify(token, process.env.JWT_SECRET!, (err, result) => {
                if (err) {
                    resolve(false)
                } else {
                    const data = zJWTAuthFormat.parse(result)
                    resolve(
                        data.isAdmin ||
                            data.destinyMembershipIds.includes(String(destinyMembershipId))
                    )
                }
            })
        )
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
