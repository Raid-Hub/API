import { registry } from "@/schema/registry"
import { z } from "zod"

export type ImageSize = z.input<typeof zImageSize>
export const zImageSize = registry.register(
    "ImageSize",
    z.enum(["tiny", "small", "medium", "large", "xlarge"]).openapi({
        description: "The size of a RaidHub CDN hosted image.",
        example: "medium"
    })
)

export type ImageContentData = z.input<typeof zImageContentData>
export const zImageContentData = registry.register(
    "ImageContentData",
    z
        .object({
            slug: z.string(),
            size: zImageSize,
            fileName: z.string(),
            fileFormat: z.string(),
            path: z.string(),
            url: z.string()
        })
        .strict()
        .openapi({
            description: "A URL to a piece of content hosted on the RaidHub CDN.",
            example: {
                slug: "vog",
                size: "medium",
                fileName: "medium.jpg",
                fileFormat: "jpg",
                path: "content/splash/vog/medium.jpg",
                url: "https://cdn.raidhub.io/content/splash/vog/medium.jpg"
            }
        })
)
