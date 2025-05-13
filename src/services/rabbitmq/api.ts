const VHOST = "/"
const MANAGEMENT_PORT = 15672

const encodedVhost = encodeURIComponent(VHOST)
const BASE_URL = `http://localhost:${MANAGEMENT_PORT}/api/queues/${encodedVhost}`

const user = process.env.RABBIT_API_USER ?? "guest"
const password = process.env.RABBIT_API_PASSWORD ?? "guest"

const auth = btoa(`${user}:${password}`)

export const getFloodgatesStatus = async () => {
    const url = BASE_URL + "/pgcr_blocked"

    const res = await fetch(url, {
        headers: {
            Authorization: `Basic ${auth}`,
            Accept: "application/json"
        }
    })

    if (!res.ok) {
        throw new Error(`RabbitMQ HTTP Error: ${res.status}: ${res.statusText}`, {
            cause: res
        })
    }

    const data = await res.json()

    return {
        waiting: data.messages as number,
        ackRateSeconds:
            Math.round(
                10_000 * ((data.backing_queue_status?.avg_ack_ingress_rate as number) ?? 0)
            ) / 10_000,
        ingressRateSeconds:
            Math.round(10_000 * ((data.backing_queue_status?.avg_ingress_rate as number) ?? 0)) /
            10_000
    }
}
