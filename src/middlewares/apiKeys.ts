import { ApiKeyError } from "@/schema/errors/ApiKeyError"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { file } from "bun"
import { RequestHandler } from "express"
import { z } from "zod"

const KeySchema = z.object({
    contact: z.string().default(""),
    description: z.string().default(""),
    origin: z.string().default("*"),
    key: z.string()
})

const readKeys = async () => file(process.env.API_KEYS_PATH!, { type: "application/json" }).json()

const apiKeys = readKeys()
    .then(data =>
        Object.fromEntries(
            z
                .array(KeySchema)
                .parse(data)
                .map(k => [k.key, k])
        )
    )
    .catch((e): Record<string, z.output<typeof KeySchema>> => {
        if (process.env.PROD) {
            console.error("Failed to load API keys", e)
            process.exit(1)
        } else {
            return {}
        }
    })

const isValidAPIKey = async (
    apiKey: string | undefined,
    origin: string | undefined
): Promise<boolean> => {
    if (!apiKey) return false

    const keys = await apiKeys

    const keyData = keys.hasOwnProperty(apiKey) ? keys[apiKey] : null

    if (!keyData) return false
    else if (keyData.origin === "*") return true
    else if (!origin) return false

    try {
        const regex = new RegExp(keyData.origin)
        return regex.test(origin)
    } catch {
        return origin === keyData.origin
    }
}

export const verifyApiKey: RequestHandler = async (req, res, next) => {
    if (!process.env.PROD) {
        res.set("Access-Control-Allow-Origin", "*")
        next()
    } else if (await isValidAPIKey(req.headers["x-api-key"]?.toString(), req.headers.origin)) {
        res.set("Access-Control-Allow-Origin", (req.headers.origin || "*").toString())
        next()
    } else {
        const err: ApiKeyError = {
            code: ErrorCode.ApiKeyError,
            minted: new Date(),
            success: false,
            error: {
                message: req.headers["x-api-key"] ? "Invalid API Key" : "Missing API Key",
                origin: req.headers.origin || null,
                apiKey: req.headers["x-api-key"]?.toString() || null
            }
        }
        res.status(401).send(err)
    }
}
