import { ApiKeyError } from "@/schema/errors/ApiKeyError"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { file } from "bun"
import { RequestHandler } from "express"
import { z } from "zod"

const KeySchema = z.object({
    origin: z.string().default("*"),
    key: z.string()
})

const apiKeys = file(process.env.API_KEYS_PATH!, { type: "application/json" })
    .json()
    .then(
        (
            data
        ): Record<
            string,
            {
                origin: string
                regex: RegExp
            }
        > =>
            Object.fromEntries(
                z
                    .array(KeySchema)
                    .parse(data)
                    .map(k => {
                        try {
                            const rgx = new RegExp(k.origin)
                            return [
                                k.key,
                                {
                                    origin: k.origin,
                                    regex: rgx
                                }
                            ]
                        } catch {
                            const rgx = new RegExp(
                                `^${k.origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`
                            )
                            return [
                                k.key,
                                {
                                    origin: k.origin,
                                    regex: rgx
                                }
                            ]
                        }
                    })
            )
    )
    .catch(
        (
            err
        ): Record<
            string,
            {
                origin: string
                regex: RegExp
            }
        > => {
            console.error("Failed to load API keys", err)
            if (process.env.PROD) {
                process.exit(1)
            } else {
                return {}
            }
        }
    )

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

    return keyData.regex.test(origin)
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
