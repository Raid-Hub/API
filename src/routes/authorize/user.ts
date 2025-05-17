import { RaidHubRoute } from "@/RaidHubRoute"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zBigIntString, zDigitString, zISODateString } from "@/schema/util"
import { generateJWT } from "@/utils/auth"
import { z } from "zod"

const TOKEN_EXPIRY = 30 * 24 * 3600

export const userAuthorizationRoute = new RaidHubRoute({
    method: "post",
    description: "Authenticate a user. Grants permission to access restricted resources.",
    body: z.object({
        bungieMembershipId: zDigitString(),
        destinyMembershipIds: z.array(zBigIntString()),
        clientSecret: z.string()
    }),
    response: {
        success: {
            statusCode: 200,
            schema: z.object({
                value: z.string(),
                expires: zISODateString()
            })
        },
        errors: [
            {
                statusCode: 403,
                code: ErrorCode.InvalidClientSecretError,
                schema: z.object({})
            }
        ]
    },
    async handler({ body }) {
        if (body.clientSecret === process.env.CLIENT_SECRET) {
            return RaidHubRoute.ok({
                value: generateJWT(
                    {
                        bungieMembershipId: body.bungieMembershipId,
                        destinyMembershipIds: body.destinyMembershipIds.map(String),
                        isAdmin: false
                    },
                    TOKEN_EXPIRY
                ),
                expires: new Date(Date.now() + TOKEN_EXPIRY * 1000)
            })
        } else {
            return RaidHubRoute.fail(ErrorCode.InvalidClientSecretError, {})
        }
    }
})
