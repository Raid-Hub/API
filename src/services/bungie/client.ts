import { BungieClientProtocol, BungieFetchConfig } from "bungie-net-core"
import { BungieNetResponse } from "bungie-net-core/interfaces"
import { BungieApiError } from "./error"

const htmlRegex = /<title>(.*?)<\/title>/

export const bungiePlatformHttp: BungieClientProtocol = {
    fetch: async <T>(config: BungieFetchConfig) => {
        const apiKey = process.env.BUNGIE_API_KEY
        if (!apiKey) {
            throw new Error("Missing Bungie API Key")
        }

        const headers = new Headers(config.headers)
        headers.append("X-API-KEY", apiKey)

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
}
