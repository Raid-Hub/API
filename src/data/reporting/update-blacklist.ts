import { InstanceFlag } from "@/schema/components/InstanceStanding"
import { postgres } from "@/services/postgres"
export const blacklistInstance = async (data: {
    instanceId: bigint | string
    reportId: string
    cheatCheckVersion: string
    players: {
        membershipId: string
        reason: string
    }[]
}) => {
    return await postgres.tx(async tx => {
        // Insert into blacklist_instance
        await tx.queryRows<InstanceFlag>(
            `INSERT INTO blacklist_instance (instance_id, report_source, report_id, reason)
            VALUES ($1::bigint, 'WebApp', $2, $3)
            ON CONFLICT (instance_id) DO NOTHING`,
            {
                params: [data.instanceId, data.reportId, data.cheatCheckVersion]
            }
        )

        // Insert players into blacklist_instance_player
        for (const player of data.players) {
            await tx.queryRows(
                `INSERT INTO blacklist_instance_player (instance_id, membership_id, reason)
                VALUES ($1::bigint, $2::bigint, $3)
                ON CONFLICT (instance_id, membership_id) DO NOTHING`,
                {
                    params: [data.instanceId, player.membershipId, player.reason]
                }
            )
        }
    })
}
