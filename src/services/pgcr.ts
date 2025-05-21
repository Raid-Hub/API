import { postgres } from "@/integrations/postgres"

export async function getRawCompressedPGCR(instanceId: bigint | string) {
    return await postgres.queryRow<{
        data: Buffer
    }>("SELECT data FROM pgcr WHERE instance_id = $1::bigint", {
        params: [instanceId]
    })
}
