import { BungieNetResponse } from "bungie-net-core/models"

export class BungieApiError extends Error {
    public readonly cause: BungieNetResponse<unknown>
    public readonly url: URL
    constructor({ cause, url }: { cause: BungieNetResponse<unknown>; url: URL }) {
        super(cause.Message)
        this.cause = cause
        this.url = url
    }
}
