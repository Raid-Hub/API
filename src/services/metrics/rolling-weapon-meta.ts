import { clickhouse } from "@/integrations/clickhouse/client"
import { WeaponMetric } from "@/schema/components/Metrics"
import { WeaponSlot } from "@/schema/components/Weapon"

export const getRollingWeaponMeta = async ({
    sort,
    count
}: {
    sort: "usage" | "kills"
    count: number
}) => {
    const sortColumn = sort === "usage" ? "totalUsage" : "totalKills"

    const results = await clickhouse.query({
        format: "JSON",
        query_params: {
            sortColumn,
            count
        },
        query: `SELECT
                    wd.slot,
                    wd.hash::UInt32 AS hash,
                    SUM(wm.usage_count)::Int AS totalUsage,
                    SUM(wm.kill_count)::Int AS totalKills,
                    SUM(wm.precision_kill_count)::Int AS totalPrecisionKills
                FROM weapon_meta_by_hour AS wm
                INNER JOIN weapon_definition AS wd ON wm.weapon_hash = wd.hash
                WHERE wm.hour BETWEEN toStartOfHour(now() - INTERVAL 1 WEEK) AND toStartOfHour(now())
                GROUP BY wd.slot, wd.hash
                ORDER BY wd.slot, {sortColumn:Identifier} DESC
                LIMIT {count:Int} BY wd.slot;`
    })

    return await results
        .json<{
            slot: WeaponSlot
            hash: number
            totalUsage: number
            totalKills: number
            totalPrecisionKills: number
        }>()
        .then(response =>
            response.data.reduce<{
                kinetic: WeaponMetric[]
                energy: WeaponMetric[]
                power: WeaponMetric[]
            }>(
                (acc, curr) => {
                    const metric: WeaponMetric = {
                        hash: curr.hash,
                        totalUsage: curr.totalUsage,
                        totalKills: curr.totalKills,
                        totalPrecisionKills: curr.totalPrecisionKills
                    }
                    switch (curr.slot) {
                        case "Kinetic":
                            acc.kinetic.push(metric)
                            break
                        case "Energy":
                            acc.energy.push(metric)
                            break
                        case "Power":
                            acc.power.push(metric)
                    }
                    return acc
                },
                {
                    kinetic: [],
                    energy: [],
                    power: []
                }
            )
        )
}
