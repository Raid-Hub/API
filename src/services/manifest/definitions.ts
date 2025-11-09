import { pgReader } from "@/integrations/postgres"
import { convertUInt32Value } from "@/integrations/postgres/parsers"
import { ActivityDefinition } from "@/schema/components/ActivityDefinition"
import { FeatDefinition } from "@/schema/components/FeatDefinition"
import { VersionDefinition } from "@/schema/components/VersionDefinition"

export const getRaidId = async (raidPath: string) => {
    return await pgReader.queryRow<{ id: number }>(
        `SELECT id::int FROM activity_definition WHERE path = $1 AND is_raid`,
        { params: [raidPath] }
    )
}

export const getVersionId = async (
    versionPath: string,
    associatedActivityId: number | null = null
) => {
    return await pgReader.queryRow<{ id: number }>(
        `SELECT id::int FROM version_definition WHERE path = $1 ${associatedActivityId ? "AND associated_activity_id = $2" : ""}`,
        { params: associatedActivityId ? [versionPath, associatedActivityId] : [versionPath] }
    )
}

export const getActivityVersion = async (activityPath: string, versionPath: string) => {
    return await pgReader.queryRow<{ activityId: number; versionId: number }>(
        `SELECT activity_id::int AS "activityId", version_id::int AS "versionId"
        FROM activity_version
        JOIN activity_definition ON activity_version.activity_id = activity_definition.id
        JOIN version_definition ON activity_version.version_id = version_definition.id
        WHERE activity_definition.path = $1 AND version_definition.path = $2
        LIMIT 1`,
        { params: [activityPath, versionPath] }
    )
}

export const listActivityDefinitions = async () => {
    return await pgReader.queryRows<ActivityDefinition>(
        `SELECT
            id::int,
            name,
            path,
            is_sunset AS "isSunset",
            is_raid AS "isRaid",
            release_date AS "releaseDate",
            day_one_end AS "dayOneEnd",
            week_one_end AS "weekOneEnd",
            contest_end AS "contestEnd",
            milestone_hash AS "milestoneHash",
            splash_path AS "splashSlug"
        FROM activity_definition`,
        {
            transformers: {
                milestoneHash: convertUInt32Value
            }
        }
    )
}

export const listVersionDefinitions = async () => {
    return await pgReader.queryRows<VersionDefinition>(
        `SELECT
            id::int,
            name,
            path,
            associated_activity_id::int AS "associatedActivityId",
            is_challenge_mode AS "isChallengeMode"
        FROM version_definition`
    )
}

export const listHashes = async () => {
    return await pgReader.queryRows<{
        hash: number
        activityId: number
        versionId: number
    }>(
        `SELECT
            hash,
            activity_id::int AS "activityId",
            version_id::int AS "versionId"
        FROM activity_version`,
        {
            transformers: {
                hash: convertUInt32Value
            }
        }
    )
}

export const listFeatDefinitions = async () => {
    return await pgReader.queryRows<FeatDefinition>(
        `SELECT
            hash AS "hash",
            skull_hash AS "skullHash",
            name,
            name_short AS "shortName",
            description,
            description_short AS "shortDescription",
            icon_path AS "iconPath",
            modifier_power_contribution AS "modifierPowerContribution"
        FROM activity_feat_definition`,
        {
            transformers: {
                hash: convertUInt32Value,
                skullHash: convertUInt32Value
            }
        }
    )
}
