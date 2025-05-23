import { postgresWritable } from "@/integrations/postgres"

export const blacklistInstance = async (data: {
    instanceId: bigint | string
    reportId: number | null
    reason: string
    players: {
        membershipId: string | bigint
        reason: string
    }[]
}) => {
    return await postgresWritable.transaction(async conn => {
        // Insert into blacklist_instance
        const reportSource = data.reportId ? "WebReport" : "Manual"
        await conn.queryRow(
            `INSERT INTO blacklist_instance (instance_id, report_source, report_id, reason)
            VALUES ($1::bigint, $2::"BlacklistReportSource", $3, $4)
            ON CONFLICT (instance_id) DO NOTHING`,
            {
                params: [data.instanceId, reportSource, data.reportId, data.reason]
            }
        )

        // Insert into blacklist_instance_flag
        const playerStmnt = await conn.prepareStatement(
            `INSERT INTO blacklist_instance_player (instance_id, membership_id, reason)
            VALUES ($1::bigint, $2::bigint, $3)
            ON CONFLICT (instance_id, membership_id) DO NOTHING`
        )

        await Promise.all(
            data.players.map(player =>
                playerStmnt.execute({
                    params: [data.instanceId, player.membershipId, player.reason]
                })
            )
        )
    })
}

export const removeInstanceBlacklist = async (instanceId: bigint | string) => {
    return await postgresWritable.queryRow(
        `DELETE FROM blacklist_instance WHERE instance_id = $1::bigint`,
        {
            params: [instanceId]
        }
    )
}
