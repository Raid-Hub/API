import { registry } from "@/schema"
import { z } from "zod"

export enum ErrorCode {
    /** Unauthorized */
    ApiKeyError = "ApiKeyError",
    /** Generic */
    PathValidationError = "PathValidationError",
    QueryValidationError = "QueryValidationError",
    BodyValidationError = "BodyValidationError",
    /** Specific */
    PlayerNotFoundError = "PlayerNotFoundError",
    PlayerPrivateProfileError = "PlayerPrivateProfileError",
    PlayerProtectedResourceError = "PlayerProtectedResourceError",
    InstanceNotFoundError = "InstanceNotFoundError",
    PGCRNotFoundError = "PGCRNotFoundError",
    PlayerNotOnLeaderboardError = "PlayerNotOnLeaderboardError",
    RaidNotFoundError = "RaidNotFoundError",
    PantheonVersionNotFoundError = "PantheonVersionNotFoundError",
    InvalidActivityVersionComboError = "InvalidActivityVersionComboError",
    ClanNotFound = "ClanNotFoundError",
    AdminQuerySyntaxError = "AdminQuerySyntaxError",
    /** Auth */
    InsufficientPermissionsError = "InsufficientPermissionsError",
    InvalidClientSecretError = "InvalidClientSecretError",
    /** RaidHub error */
    InternalServerError = "InternalServerError",
    /** Bungie */
    BungieServiceOffline = "BungieServiceOffline"
}

export const zErrorCode = registry.register("ErrorCode", z.nativeEnum(ErrorCode))
