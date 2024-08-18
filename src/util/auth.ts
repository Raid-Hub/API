import jwt from "jsonwebtoken"
import { z } from "zod"
import { zDigitString } from "../schema/util"

const zJWTAuthFormat = z.object({
    isAdmin: z.boolean(),
    bungieMembershipId: zDigitString(),
    destinyMembershipIds: z.array(zDigitString())
})

export const generateJWT = (data: z.infer<typeof zJWTAuthFormat>, expiresIn: number) => {
    return jwt.sign(data, process.env.JWT_SECRET, {
        expiresIn
    })
}

export const canAccessPrivateProfile = async (
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
        // TODO: Log error
        console.error(err)
        return false
    }
}
