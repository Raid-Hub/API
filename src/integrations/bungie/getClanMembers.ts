import { getMembersOfGroup } from "bungie-net-core/endpoints/GroupV2"
import { GroupMember } from "bungie-net-core/models"
import { bungiePlatformHttp } from "./client"

const client = bungiePlatformHttp({ ttl: 30_000 })

export const getClanMembers = async (groupId: string | bigint) => {
    const members: GroupMember[] = []
    let hasMore = true
    let currentpage = 1

    do {
        const searchResult = await getMembersOfGroup(client, {
            groupId: String(groupId),
            currentpage
        }).then(res => res.Response)
        members.push(...searchResult.results)
        hasMore = searchResult.hasMore
        currentpage++
    } while (hasMore)

    return members
}
