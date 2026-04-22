import jwt from "jsonwebtoken"
import { z } from "zod"

export const zJWTAuthFormat = z.object({
    isAdmin: z.boolean(),
    bungieMembershipId: z.string(),
    destinyMembershipIds: z.array(z.string())
})

export type JWTAuthContext = z.infer<typeof zJWTAuthFormat>

export const generateJWT = (data: JWTAuthContext, expiresIn: number) => {
    return jwt.sign(data, process.env.JWT_SECRET, {
        expiresIn
    })
}
