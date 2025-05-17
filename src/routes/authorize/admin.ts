import { z } from "zod"
import { RaidHubRoute } from "../../RaidHubRoute"
import { ErrorCode } from "../../schema/errors/ErrorCode"
import { zDigitString, zISODateString } from "../../schema/util"
import { generateJWT } from "../../utils/auth"

const TOKEN_EXPIRY = 3600

export const adminAuthorizationRoute = new RaidHubRoute({
    method: "post",
    description: "Authorize an admin user. Requires the client secret.",
    body: z.object({
        bungieMembershipId: zDigitString(),
        adminClientSecret: z.string()
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
        if (body.adminClientSecret === process.env.ADMIN_CLIENT_SECRET) {
            return RaidHubRoute.ok({
                value: generateJWT(
                    {
                        bungieMembershipId: body.bungieMembershipId,
                        isAdmin: true,
                        destinyMembershipIds: []
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
