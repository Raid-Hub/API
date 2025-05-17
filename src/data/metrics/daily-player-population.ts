import { PopulationByRaidMetric } from "@/schema/components/Metrics"
import { clickhouse } from "@/services/clickhouse/client"

export const getDailyPlayerPopulation = async () => {
    const results = await clickhouse.query({
        format: "JSON",
        query: `WITH aggregated AS (
                    SELECT 
                        hour, 
                        activity_id, 
                        SUM(player_count)::UInt32 AS total_player_count
                    FROM player_population_by_hour
                    WHERE hour BETWEEN toStartOfHour(now() - INTERVAL 1 DAY) AND toStartOfHour(now())
                    GROUP BY hour, activity_id
                )
                SELECT
                    hour,
                    mapFromArrays(groupArray(activity_id), groupArray(total_player_count)) AS population
                FROM aggregated
                GROUP BY hour
                ORDER BY hour DESC;
`
    })

    return await results
        .json<{
            hour: string
            population: PopulationByRaidMetric
        }>()
        .then(response => response.data)
}
