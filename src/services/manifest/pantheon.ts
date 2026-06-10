import { pgReader } from "@/integrations/postgres"
import { ActivityDefinition } from "@/schema/components/ActivityDefinition"
import { VersionDefinition } from "@/schema/components/VersionDefinition"

export const PANTHEON_ACTIVITY_PATH = "pantheon"
export const PANTHEON_ACTIVITY_PATHS = ["pantheon", "thepantheon"] as const

const isPantheonActivity = (activity: ActivityDefinition) =>
    PANTHEON_ACTIVITY_PATHS.includes(activity.path as (typeof PANTHEON_ACTIVITY_PATHS)[number])

export const getPantheonActivityIds = (activities: ActivityDefinition[]) =>
    activities.filter(isPantheonActivity).map(activity => activity.id)

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

export const getPantheonVersionIds = (
    versions: VersionDefinition[],
    pantheonActivityIds: readonly number[],
    activities: ActivityDefinition[]
) => {
    const activityById = new Map(activities.map(activity => [activity.id, activity]))
    const pantheonVersions = versions
        .filter(
            version =>
                version.associatedActivityId !== null &&
                pantheonActivityIds.includes(version.associatedActivityId)
        )
        .sort((a, b) => a.id - b.id)

    const activeVersionIds: number[] = []
    const sunsetVersionIds: number[] = []

    for (const version of pantheonVersions) {
        const activity = activityById.get(version.associatedActivityId!)
        if (activity?.isSunset) {
            sunsetVersionIds.push(version.id)
        } else {
            activeVersionIds.push(version.id)
        }
    }

    return {
        pantheonVersionIds: activeVersionIds,
        pantheonSunsetVersionIds: sunsetVersionIds
    }
}

export const getPantheonVersionId = async (versionPath: string) => {
    return await pgReader.queryRow<{ id: number }>(
        `SELECT vd.id::int
         FROM version_definition vd
         INNER JOIN activity_definition ad ON ad.id = vd.associated_activity_id
         WHERE vd.path = $1 AND ad.path = ANY($2::text[])
         ORDER BY ad.is_sunset ASC, ad.id DESC
         LIMIT 1`,
        { params: [versionPath, PANTHEON_ACTIVITY_PATHS] }
    )
}
