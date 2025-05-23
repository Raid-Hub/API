import { RequestHandler } from "express"

export function cacheControl<P, S, B, Q>(seconds: number): RequestHandler<P, S, B, Q> {
    return (_, res, next) => {
        // save the previous send method
        const _send = res.send.bind(res)

        // override the send method to cache with 200's
        res.send = body => {
            if (res.statusCode === 200) {
                res.setHeader("Cache-Control", `max-age=${seconds}`)
            }
            return _send(body)
        }

        next()
    }
}
