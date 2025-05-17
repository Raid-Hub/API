import { postgres } from "@/services/postgres"

export const getLatestActivityByDate = async () => {
    const latestActivity = await postgres.queryRow<{
        instanceId: string
        dateCompleted: Date
        dateResolved: Date
    }>(
        `SELECT 
            t1.instance_id::text AS "instanceId",
            t1.date_completed AT TIME ZONE 'UTC' AS "dateCompleted", 
            pgcr.date_crawled AS "dateResolved"
        FROM (
            SELECT 
                date_completed , 
                instance_id
            FROM instance 
            ORDER BY instance_id DESC 
            LIMIT 50
        ) AS t1 
        JOIN pgcr ON t1.instance_id = pgcr.instance_id
        ORDER BY date_completed DESC 
        LIMIT 1`
    )

    if (!latestActivity) {
        throw new Error("Postgres query failed")
    }

    return latestActivity
}
