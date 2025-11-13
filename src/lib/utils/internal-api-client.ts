export class InternalApiError extends Error {
    public readonly serviceName: string
    public readonly status: number
    public readonly statusText: string
    public readonly url: URL
    public readonly cause: Response

    constructor({
        message,
        serviceName,
        status,
        statusText,
        url,
        cause
    }: {
        message: string
        serviceName: string
        status: number
        statusText: string
        url: URL
        cause: Response
    }) {
        super(message)
        this.serviceName = serviceName
        this.status = status
        this.statusText = statusText
        this.url = url
        this.cause = cause
    }
}

/**
 * Generic HTTP client for internal API calls.
 * Throws errors on non-OK status codes, but allows JSON parsing errors to propagate naturally.
 */
export const internalApiFetch = async <T>(
    serviceName: string,
    url: string | URL,
    options?: RequestInit
): Promise<T> => {
    const urlObj = typeof url === "string" ? new URL(url) : url
    const response = await fetch(urlObj, options)

    if (!response.ok) {
        throw new InternalApiError({
            message: `Internal API HTTP Error: ${response.status}: ${response.statusText}`,
            serviceName,
            status: response.status,
            statusText: response.statusText,
            url: urlObj,
            cause: response
        })
    }

    if (!response.headers.get("content-type")?.includes("application/json")) {
        throw new InternalApiError({
            message: `Failed to parse JSON from Internal API: ${response.status}: ${response.statusText}`,
            serviceName,
            status: response.status,
            statusText: response.statusText,
            url: urlObj,
            cause: response
        })
    }

    return (await response.json()) as T
}
