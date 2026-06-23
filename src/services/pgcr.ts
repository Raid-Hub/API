import { pgReader } from "@/integrations/postgres"
import { gunzipSync } from "bun"

const decoder = new TextDecoder()

/** Gzip magic bytes — matches Services `log-raw-pgcr` and Hermes storage (plain JSON when absent). */
function isGzipCompressed(data: Buffer): boolean {
    return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b
}

/** Decode PGCR payload stored as gzip (legacy raw.pgcr) or plain JSON (pgcr table). */
export function decodePgcrPayload(data: Buffer): string {
    if (isGzipCompressed(data)) {
        return decoder.decode(gunzipSync(data))
    }
    return decoder.decode(data)
}

export async function getRawCompressedPGCR(instanceId: bigint | string) {
    return await pgReader.queryRow<{
        data: Buffer
    }>("SELECT data FROM pgcr WHERE instance_id = $1::bigint", { params: [instanceId] })
}
