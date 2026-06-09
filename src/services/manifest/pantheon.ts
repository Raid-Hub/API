import { pgReader } from "@/integrations/postgres"
import { ActivityDefinition } from "@/schema/components/ActivityDefinition"
import { VersionDefinition } from "@/schema/components/VersionDefinition"

export const PANTHEON_ACTIVITY_PATH = "pantheon"
export const PANTHEON_SUNSET_ACTIVITY_PATH = "thepantheon"
export const GAUNTLET_VERSION_PATH = "gauntlet"
export const PANTHEON_ACTIVITY_PATHS = [
    PANTHEON_ACTIVITY_PATH,
    PANTHEON_SUNSET_ACTIVITY_PATH
] as const

const isPantheonActivityPath = (path: string) =>
    (PANTHEON_ACTIVITY_PATHS as readonly string[]).includes(path)

export const getPantheonActivityIds = (activities: ActivityDefinition[]) =>
    activities
        .filter(activity => isPantheonActivityPath(activity.path))
        .map(activity => activity.id)

export const sortPantheonActivityIds = (
    activities: ActivityDefinition[],
    pantheonActivityIds: readonly number[]
) => {
    const activityById = new Map(activities.map(activity => [activity.id, activity]))

    return [...pantheonActivityIds].sort((a, b) => {
        const activityA = activityById.get(a)
        const activityB = activityById.get(b)
        if (!activityA || !activityB) {
            return b - a
        }
        if (+activityA.isSunset ^ +activityB.isSunset) {
            return activityA.isSunset ? 1 : -1
        }
        return b - a
    })
}

export const getGauntletVersionIds = (
    versions: VersionDefinition[],
    pantheonActivityIds: readonly number[]
) =>
    versions
        .filter(
            version =>
                version.path === GAUNTLET_VERSION_PATH &&
                version.associatedActivityId !== null &&
                pantheonActivityIds.includes(version.associatedActivityId)
        )
        .map(version => version.id)

export const getPantheonVersionId = async (versionPath: string) => {
    return await pgReader.queryRow<{ id: number }>(
        `SELECT vd.id::int
         FROM version_definition vd
         INNER JOIN activity_definition ad ON ad.id = vd.associated_activity_id
         WHERE vd.path = $1 AND ad.path = ANY($2::text[])
         ORDER BY ad.is_sunset ASC, ad.id DESC
         LIMIT 1`,
        { params: [versionPath, [...PANTHEON_ACTIVITY_PATHS]] }
    )
}
