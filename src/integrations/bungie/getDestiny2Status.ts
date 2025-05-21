import { getCommonSettings } from "bungie-net-core/endpoints/Core"
import { bungiePlatformHttp } from "./client"

const client = bungiePlatformHttp({ ttl: 15_000 })

export const getDestiny2Status = () =>
    getCommonSettings(client).then(res => res.Response.systems.Destiny2.enabled)
