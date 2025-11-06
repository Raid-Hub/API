import { Logger } from "@/lib/utils/logging"
import { serve } from "bun"
import { prometheusRegistry } from "./registry"

const logger = new Logger("PROMETHEUS")

const port = process.env.METRICS_PORT || 8082
export const servePrometheus = () => {
    serve({
        port: port,
        async fetch(req) {
            try {
                const url = new URL(req.url)
                if (url.pathname === "/metrics") {
                    const body = await prometheusRegistry.metrics()
                    return new Response(body, {
                        headers: {
                            "Content-Type": prometheusRegistry.contentType
                        }
                    })
                } else {
                    return new Response(undefined, {
                        status: 404
                    })
                }
            } catch {
                return new Response(undefined, {
                    status: 500
                })
            }
        }
    })

    logger.info("METRICS_SERVER_STARTED", {
        port: port,
        status: "ready"
    })
}
