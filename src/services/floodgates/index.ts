import { promQuery } from "@/integrations/prometheus/api"
import { fetchRabbitQueue } from "@/integrations/rabbitmq/api"

export const getFloodgatesRecentId = async () => {
    const response = await promQuery({
        query: "floodgates_recent_pgcr * (changes(floodgates_recent_pgcr[3m]) > bool 0)"
    })

    const t = response.data.result[0]?.value

    // If the query returns no results or 0, then there is no recent PGCR
    if (!t || t[1] == "0") {
        return null
    }

    return t[1]
}

export const getFloodgatesStatus = async () => {
    const data = await fetchRabbitQueue("pgcr_blocked")

    return {
        waiting: data.messages,
        ackRateSeconds:
            Math.round(10_000 * (data.backing_queue_status?.avg_ack_ingress_rate ?? 0)) / 10_000,
        ingressRateSeconds:
            Math.round(10_000 * (data.backing_queue_status?.avg_ingress_rate ?? 0)) / 10_000
    }
}
