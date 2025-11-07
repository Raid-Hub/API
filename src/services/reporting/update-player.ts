import { pgAdmin } from "@/integrations/postgres"
import { CheatLevel } from "@/schema/enums/CheatLevel"

export const updatePlayer = async (data: {
    membershipId: bigint | string
    cheatLevel: CheatLevel | null
}) => {
    const stmnt = await pgAdmin.prepare(`
        UPDATE player
        SET cheat_level = COALESCE($2, cheat_level)
        WHERE membership_id = $1::bigint`)

    return await stmnt.execute([data.membershipId, data.cheatLevel])
}
