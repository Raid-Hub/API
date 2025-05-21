import { postgresWritable } from "@/integrations/postgres"

export const blacklistInstance = async (data: {
    instanceId: bigint | string
    reportId: number | null
    reason: string
    players: {
        membershipId: string
        reason: string
    }[]
}) => {
    return await postgresWritable.transaction(async conn => {
        // Insert into blacklist_instance
        const stmnt = await conn.prepare(
            `INSERT INTO blacklist_instance (instance_id, report_source, report_id, reason)
            VALUES ($1::bigint, 'WebApp', $2, $3)
            ON CONFLICT (instance_id) DO NOTHING`
        )

        await stmnt.execute({
            params: [data.instanceId, data.reportId, data.reason]
        })

        if (!data.players.length) {
            return
        }

        // Insert into blacklist_instance_flag
        const playerStmnt = await conn.prepare(
            `INSERT INTO blacklist_instance_flag (instance_id, membership_id, reason)
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
