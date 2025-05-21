import { ErrorCode } from "@/schema/errors/ErrorCode"
import { RouteConfig } from "@asteasolutions/zod-to-openapi"
import { Router } from "express"
import { IncomingHttpHeaders } from "http"
import { ZodType, z } from "zod"
import { RaidHubRouter } from "./RaidHubRouter"

export interface IRaidHubRoute {
    express: Router
    $generateOpenApiRoutes(): RouteConfig[]
    setParent(parent: RaidHubRouter | null): void
    getParent(): RaidHubRouter | null
}

export type ErrorData = readonly [
    ...{
        statusCode: 400 | 401 | 403 | 404 | 501 | 503
        code: ErrorCode
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        schema: z.ZodObject<any>
    }[]
]

export type RaidHubHandler<
    Params extends ZodType,
    Query extends ZodType,
    Body extends ZodType,
    T,
    ErrorResponse extends ErrorData
> = (
    req: {
        params: z.output<Params>
        query: z.output<Query>
        body: z.output<Body>
        headers: IncomingHttpHeaders
    },
    after: (callback: () => Promise<void>) => void
) => Promise<RaidHubHandlerReturn<T, ErrorResponse>>

export type RaidHubHandlerReturn<T, E extends ErrorData> =
    | { success: true; response: T }
    | {
          [K in keyof E]: {
              success: false
              error: z.input<E[K]["schema"]>
              code: E[K]["code"]
          }
      }[number]
