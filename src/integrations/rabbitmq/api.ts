import { internalApiFetch } from "@/lib/utils/internal-api-client"

const VHOST = "/"
const MANAGEMENT_PORT = 15672

const encodedVhost = encodeURIComponent(VHOST)
const BASE_URL = `http://localhost:${MANAGEMENT_PORT}/api/queues/${encodedVhost}`

const user = process.env.RABBIT_API_USER ?? "guest"
const password = process.env.RABBIT_API_PASSWORD ?? "guest"

const auth = btoa(`${user}:${password}`)

interface RabbitQueueResponse {
    messages: number
    backing_queue_status?: {
        // other fields ommitted for brevity
        avg_ingress_rate: number
        avg_egress_rate: number
    }
}

export const fetchRabbitQueue = async (queueName: string) => {
    const url = BASE_URL + "/" + encodeURIComponent(queueName)

    return internalApiFetch<RabbitQueueResponse>("rabbitmq", url, {
        headers: {
            Authorization: `Basic ${auth}`,
            Accept: "application/json"
        }
    })
}
