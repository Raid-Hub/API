import { getCommonSettings } from "bungie-net-core/endpoints/Core"
import { bungiePlatformHttp } from "./client"

export const getDestiny2Status = () =>
    getCommonSettings(bungiePlatformHttp).then(res => res.Response.systems.Destiny2.enabled)
