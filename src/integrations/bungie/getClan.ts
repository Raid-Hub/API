import { getGroup } from "bungie-net-core/endpoints/GroupV2"
import { bungiePlatformHttp } from "./client"

const client = bungiePlatformHttp({ ttl: 30_000 })

export const getClan = async (groupId: bigint | string) => {
    const group = await getGroup(client, {
        groupId: String(groupId)
    }).then(res => res.Response)
    if (group.detail.groupType !== 1) {
        return null
    }
    return group
}
