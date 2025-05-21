import jwt from "jsonwebtoken"
import { zJWTAuthFormat } from "./jwt"

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
        process.env.NODE_ENV !== "test" && console.error(err)
        return false
    }
}
