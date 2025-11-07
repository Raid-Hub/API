import { pgReader } from "@/integrations/postgres"

export async function getRawCompressedPGCR(instanceId: bigint | string) {
    return await pgReader.queryRow<{
        data: Buffer
    }>("SELECT data FROM pgcr WHERE instance_id = $1::bigint", [instanceId])
}
