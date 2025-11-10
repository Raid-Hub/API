import jwt from "jsonwebtoken"
import { z } from "zod"

export const zJWTAuthFormat = z.object({
    isAdmin: z.boolean(),
    bungieMembershipId: z.string(),
    destinyMembershipIds: z.array(z.string())
})

export const generateJWT = (data: z.infer<typeof zJWTAuthFormat>, expiresIn: number) => {
    return jwt.sign(data, process.env.JWT_SECRET, {
        expiresIn
    })
}
