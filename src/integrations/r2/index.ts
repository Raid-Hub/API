import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3"

const R2_ENDPOINT = process.env.R2_ENDPOINT!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!
const R2_BUCKET_NAME = process.env.R2_BUCKET!

class BucketCache {
    readonly ttl: number
    private cache = new Map<string, string[]>()
    private cacheTimer: ReturnType<typeof setTimeout> | null = null

    constructor(ttl = 1000 * 60 * 5) {
        this.ttl = ttl
    }

    has(cacheKey: string) {
        return this.cache.has(cacheKey)
    }

    get(cacheKey: string) {
        return this.cache.get(cacheKey)
    }

    set(cacheKey: string, content: string[]) {
        this.cache.set(cacheKey, content)
        this.queueCacheClear(cacheKey)
    }

    private queueCacheClear(cacheKey: string) {
        if (this.cacheTimer) {
            clearTimeout(this.cacheTimer)
        }
        this.cacheTimer = setTimeout(() => {
            this.cache.delete(cacheKey)
        }, this.ttl)
    }
}

const cache = new BucketCache()

export async function* streamR2BucketContents({ prefix = "", useCache = false } = {}) {
    const s3 = new S3Client({
        region: "auto", // Required for R2
        endpoint: R2_ENDPOINT,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY
        }
    })

    let continuationToken: string | undefined = undefined

    const cacheKey = R2_BUCKET_NAME + "|" + prefix
    if (useCache && cache.has(cacheKey)) {
        const cached = cache.get(cacheKey)!
        for (const item of cached) {
            yield item
        }
        return
    }

    const allContents: string[] = []
    do {
        const command: ListObjectsV2Command = new ListObjectsV2Command({
            Bucket: R2_BUCKET_NAME,
            Prefix: prefix,
            ContinuationToken: continuationToken
        })

        const response = await s3.send(command)
        const objects = response.Contents || []

        for (const obj of objects) {
            if (obj.Key) {
                allContents.push(obj.Key)
                yield obj.Key
            }
        }

        continuationToken = response.NextContinuationToken
    } while (continuationToken)

    cache.set(cacheKey, allContents)
}
