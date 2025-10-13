import { streamR2BucketContents } from "@/integrations/r2"
import { ActivityDefinition } from "@/schema/components/ActivityDefinition"
import { ImageContentData, ImageSize } from "@/schema/components/ImageContentData"

const baseUrl = "https://cdn.raidhub.io"

export const generateSplashUrls = async (defs: ActivityDefinition[]) => {
    const allValidSlugs = new Map<string, number>(defs.map(def => [def.splashSlug, def.id]))
    const result: Record<number, ImageContentData[]> = Object.fromEntries(
        defs.filter(def => allValidSlugs.has(def.splashSlug)).map(def => [def.id, []])
    )
    for await (const item of streamR2BucketContents({
        prefix: "content/splash/",
        useCache: true
    })) {
        const processed = processContentUrl(item)
        if (allValidSlugs.has(processed.slug)) {
            const activityId = allValidSlugs.get(processed.slug)!
            const bucket = result[activityId]!
            bucket.push(processed)
        }
    }
    return result
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
