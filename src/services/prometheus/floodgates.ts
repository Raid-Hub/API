import { query } from "./api"

export const getFloodgatesRecentId = async () => {
    const response = await query({
        query: "floodgates_recent_pgcr * (changes(floodgates_recent_pgcr[3m]) > bool 0)"
    })

    const t = response.data.result[0]?.value

    // If the query returns no results or 0, then there is no recent PGCR
    if (!t || t[1] == "0") {
        return null
    }

    return t[1]
}
