import { apiVersion } from "@/core/version"
import { BungieFetchConfig } from "bungie-net-core"
import { BungieNetResponse } from "bungie-net-core/interfaces"
import { BungieApiError } from "./error"

const htmlRegex = /<title>(.*?)<\/title>/

const inMemoryCache = new Map<
    string,
    {
        data: unknown
        timer: Timer
    }
>()

export const bungiePlatformHttp = (opts: { ttl: number }) => ({
    fetch: async <T>(config: BungieFetchConfig) => {
        const cacheKey = config.url.toString()
        if (inMemoryCache.has(cacheKey)) {
            return inMemoryCache.get(cacheKey)!.data as T
        }

        const apiKey = process.env.BUNGIE_API_KEY
        if (!apiKey) {
            throw new Error("Missing Bungie API Key")
        }

        const headers = new Headers(config.headers)
        headers.append("X-API-KEY", apiKey)
        headers.append("User-Agent", `RaidHub-API/${apiVersion} (contact=admin@raidhub.io)`)

        const response = await fetch(config.url, {
            method: config.method,
            headers: headers,
            body: config.body
        })

        if (response.headers.get("content-type")?.includes("application/json")) {
            const data = (await response.json()) as BungieNetResponse<unknown>

            if (!("ErrorCode" in data)) {
                throw new Error("Invalid JSON response", {
                    cause: data
                })
            }

            if (data.ErrorCode !== 1) {
                throw new BungieApiError({
                    cause: data,
                    url: config.url
                })
            } else {
                // This is needed because we could have fired multiple requests to the same URL simultaneously
                if (inMemoryCache.has(cacheKey)) {
                    clearTimeout(inMemoryCache.get(cacheKey)!.timer)
                }
                inMemoryCache.set(cacheKey, {
                    data,
                    timer: setTimeout(() => {
                        inMemoryCache.delete(cacheKey)
                    }, opts.ttl)
                })

                return data as T
            }
        } else {
            const body = await response.text()
            const match = body.match(htmlRegex)
            if (match) {
                throw new Error(`Invalid HTML response (${response.status}): ${match[1]}`, {
                    cause: body
                })
            } else {
                throw new Error(`Invalid response (${response.status}): ${response.statusText}`, {
                    cause: body
                })
            }
        }
    }
})
