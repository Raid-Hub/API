import { streamR2BucketContents } from "@/integrations/r2"
import { ActivityDefinition } from "@/schema/components/ActivityDefinition"
import { ImageContentData, ImageSize } from "@/schema/components/ImageContentData"
import { VersionDefinition } from "@/schema/components/VersionDefinition"

const baseUrl = "https://cdn.raidhub.io"

const indexSplashObjects = async (
    slugToIds: Map<string, number[]>
): Promise<Record<number, ImageContentData[]>> => {
    const allIds = [...new Set([...slugToIds.values()].flat())]
    const result: Record<number, ImageContentData[]> = Object.fromEntries(
        allIds.map(id => [id, []])
    )

    for await (const item of streamR2BucketContents({
        prefix: "content/splash/",
        useCache: true
    })) {
        const processed = processContentUrl(item)
        const ids = slugToIds.get(processed.slug)
        if (!ids) {
            continue
        }
        for (const id of ids) {
            result[id].push(processed)
        }
    }

    return result
}

const groupIdsBySlug = (entries: [string, number][]): Map<string, number[]> => {
    const slugToIds = new Map<string, number[]>()
    for (const [slug, id] of entries) {
        const ids = slugToIds.get(slug) ?? []
        ids.push(id)
        slugToIds.set(slug, ids)
    }
    return slugToIds
}

export const generateSplashUrls = async (defs: ActivityDefinition[]) => {
    return indexSplashObjects(groupIdsBySlug(defs.map(def => [def.splashSlug, def.id])))
}

export const generateVersionSplashUrls = async (versions: VersionDefinition[]) => {
    return indexSplashObjects(
        groupIdsBySlug(
            versions
                .filter(version => version.associatedActivityId !== null)
                .map(version => [version.path, version.id])
        )
    )
}

const processContentUrl = (path: string): ImageContentData => {
    const components = path.split("/")
    const slug = components[2]
    const fileName = components[components.length - 1]
    const fileNameComponents = fileName.split(".")
    const size = fileNameComponents[0] as ImageSize
    const fileFormat = fileNameComponents[1]

    return {
        slug,
        size,
        fileName,
        fileFormat,
        path,
        url: `${baseUrl}/${path}`
    }
}
