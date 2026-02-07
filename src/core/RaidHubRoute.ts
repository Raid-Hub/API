/* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any */
import { Logger } from "@/lib/utils/logging"
import { durationMetrics } from "@/middleware/duration-metrics"
import { regionMetrics } from "@/middleware/region-metrics"
import { requestLogging } from "@/middleware/request-logging"
import { zApiKeyError } from "@/schema/errors/ApiKeyError"
import { BodyValidationError, zBodyValidationError } from "@/schema/errors/BodyValidationError"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zInsufficientPermissionsError } from "@/schema/errors/InsufficientPermissionsError"
import { zInternalServerError } from "@/schema/errors/InternalServerError"
import { PathValidationError, zPathValidationError } from "@/schema/errors/PathValidationError"
import { QueryValidationError, zQueryValidationError } from "@/schema/errors/QueryValidationError"
import { RequestHandler, Router } from "express"
import { IncomingHttpHeaders } from "http"
import { ZodObject, ZodType, ZodTypeAny, ZodUnknown, z } from "zod"
import { RaidHubResponse, registerError, registerResponse } from "./RaidHubResponse"
import { RaidHubRouter } from "./RaidHubRouter"
import {
    ErrorData,
    IRaidHubRoute,
    RaidHubHandler,
    RaidHubHandlerReturn
} from "./RaidHubRouterTypes"

const logger = new Logger("API_ROUTING_SERVICE")

// This class is used to define type-safe a route in the RaidHub API
export class RaidHubRoute<
    M extends "get" | "post" | "patch" | "put" | "delete",
    ResponseBody extends ZodType,
    ErrorResponse extends ErrorData,
    Params extends ZodObject<
        any,
        any,
        any,
        { [x: string]: any },
        { [x: string]: any }
    > = z.ZodObject<{}>,
    Query extends ZodObject<
        any,
        any,
        any,
        { [x: string]: any },
        { [x: string]: any }
    > = z.ZodObject<{}>,
    Body extends ZodType = ZodUnknown
> implements IRaidHubRoute
{
    readonly method: M
    readonly description: string
    readonly paramsSchema: Params | null
    readonly querySchema: Query | null
    readonly bodySchema: Body | null
    readonly responseSchema: ResponseBody
    readonly errors: ErrorResponse | never[]
    readonly successCode: 200 | 201 | 207
    private parent: RaidHubRouter | null = null
    private readonly isAdministratorRoute: boolean = false
    private readonly isProtectedPlayerRoute: boolean = false
    private readonly isDeprecated: boolean = false
    private readonly middlewares: RequestHandler<
        z.output<Params>,
        any,
        z.output<Body>,
        z.output<Query>
    >[]
    private readonly handler: RaidHubHandler<
        Params,
        Query,
        Body,
        z.input<ResponseBody>,
        ErrorResponse
    >
    private readonly expressRouter: Router

    // Construct a new route for the API and attach it into a router with myRoute.router
    constructor(args: {
        method: M
        description: string
        params?: Params | null
        query?: Query | null
        body?: Body | null
        isAdministratorRoute?: boolean
        isProtectedPlayerRoute?: boolean
        isDeprecated?: boolean
        middleware?: RequestHandler<z.output<Params>, any, z.output<Body>, z.output<Query>>[]
        handler: RaidHubHandler<
            Params,
            Query,
            Body,
            NoInfer<z.input<ResponseBody>>,
            NoInfer<ErrorResponse>
        >
        response: {
            success: {
                statusCode: 200 | 201 | 207
                schema: ResponseBody
            }
            errors?: ErrorResponse | never[]
        }
    }) {
        this.expressRouter = Router({
            strict: true,
            mergeParams: true
        })
        this.method = args.method
        this.description = args.description
        this.paramsSchema = args.params ?? null
        this.querySchema = args.query ?? null
        this.bodySchema = args.body ?? null
        this.isAdministratorRoute = args.isAdministratorRoute ?? false
        this.isProtectedPlayerRoute = args.isProtectedPlayerRoute ?? false
        this.isDeprecated = args.isDeprecated ?? false
        this.middlewares = args.middleware ?? []
        this.handler = args.handler
        this.responseSchema = args.response.success.schema
        this.errors = args.response.errors ?? []
        this.successCode = args.response.success.statusCode
    }

    static ok<T>(response: T) {
        return {
            response,
            success: true as const
        }
    }

    static fail<E, C extends ErrorCode>(code: C, error: E) {
        return {
            error,
            success: false as const,
            code
        }
    }

    private validateParams: RequestHandler<z.output<Params>, any, z.output<Body>, z.output<Query>> =
        (req, res, next) => {
            if (!this.paramsSchema) {
                req.params = {}
                return next()
            }
            const parsed = this.paramsSchema.strict().safeParse(req.params)
            if (parsed.success) {
                req.params = parsed.data
                next()
            } else {
                const result: PathValidationError = {
                    minted: new Date(),
                    success: false,
                    code: ErrorCode.PathValidationError,
                    error: {
                        issues: parsed.error.issues
                    }
                }
                res.status(404).json(result)
            }
        }

    private validateQuery: RequestHandler<z.output<Params>, any, z.output<Body>, z.output<Query>> =
        (req, res, next) => {
            if (!this.querySchema) {
                req.query = {}
                return next()
            }
            const parsed = this.querySchema.strip().safeParse(req.query ?? {})
            if (parsed.success) {
                req.query = parsed.data
                next()
            } else {
                const result: QueryValidationError = {
                    minted: new Date(),
                    success: false,
                    code: ErrorCode.QueryValidationError,
                    error: {
                        issues: parsed.error.issues
                    }
                }
                res.status(400).json(result)
            }
        }

    private validateBody: RequestHandler<z.output<Params>, any, z.output<Body>, z.output<Query>> = (
        req,
        res,
        next
    ) => {
        if (!this.bodySchema) {
            req.body = null
            return next()
        }
        const parsed = this.bodySchema.safeParse(req.body)
        if (parsed.success) {
            req.body = parsed.data
            next()
        } else {
            const result: BodyValidationError = {
                minted: new Date(),
                success: false,
                code: ErrorCode.BodyValidationError,
                error: {
                    issues: parsed.error.issues
                }
            }
            res.status(400).json(result)
        }
    }

    /** Router to mount at a path (use with router.use(path, route.mountable)) */
    get mountable() {
        return this.expressRouter[this.method](
            "/",
            durationMetrics(this.getFullPath()),
            regionMetrics(),
            requestLogging(),
            this.validateParams,
            this.validateQuery,
            this.validateBody,
            ...this.middlewares,
            async (req, res, next) => {
                try {
                    const result = await this.handler(req, function after(callback) {
                        res.on("finish", async () => {
                            try {
                                await callback()
                            } catch (err) {
                                logger.error(
                                    "ROUTE_AFTER_CALLBACK_ERROR",
                                    err instanceof Error ? err : new Error(String(err)),
                                    {
                                        path: req.path,
                                        method: req.method,
                                        url: req.url
                                    }
                                )
                            }
                        })
                    })
                    const response = this.buildResponse(result)
                    if (result.success) {
                        res.status(this.successCode).json(response)
                    } else {
                        res.status(
                            this.errors.find(err => err.code === result.code)!.statusCode
                        ).json(response)
                    }
                } catch (e) {
                    next(e)
                }
            }
        )
    }

    private buildResponse(
        result: RaidHubHandlerReturn<z.input<ResponseBody>, ErrorResponse>
    ): RaidHubResponse<z.input<ResponseBody>, ErrorData> {
        const minted = new Date()
        if (result.success) {
            return {
                minted,
                success: true,
                response: result.response
            } as const
        } else {
            return {
                minted,
                success: false,
                code: result.code,
                error: result.error
            } as const
        }
    }

    setParent(parent: RaidHubRouter) {
        this.parent = parent
    }

    getParent(): RaidHubRouter | null {
        return this.parent
    }

    getFullPath(): string {
        return this.parent ? this.parent.getFullPath(this) : "/"
    }

    deprecatedCopy() {
        return new RaidHubRoute({
            isDeprecated: true,
            method: this.method,
            description: this.description,
            params: this.paramsSchema,
            query: this.querySchema,
            body: this.bodySchema,
            isAdministratorRoute: this.isAdministratorRoute,
            isProtectedPlayerRoute: this.isProtectedPlayerRoute,
            middleware: this.middlewares,
            handler: this.handler,
            response: {
                success: {
                    statusCode: this.successCode,
                    schema: this.responseSchema
                },
                errors: this.errors
            }
        })
    }

    $generateOpenApiRoutes() {
        const path = this.getFullPath().replace(/\/:(\w+)/g, "/{$1}")

        const allResponses = [
            [this.successCode, "Success", registerResponse(path, this.responseSchema)],
            ...this.errors.map(({ statusCode, schema, code }) => [
                statusCode,
                code,
                registerError(code, schema)
            ]),
            [401, "Unauthorized", zApiKeyError],
            this.isAdministratorRoute ? [403, "Forbidden", zInsufficientPermissionsError] : null,
            this.paramsSchema ? [404, "Not found", zPathValidationError] : null,
            this.querySchema ? [400, "Bad request", zQueryValidationError] : null,
            this.bodySchema ? [400, "Bad request", zBodyValidationError] : null,
            [500, "Internal Server Error", zInternalServerError]
        ].filter(Boolean) as [number, string, ZodObject<any>][]

        const byCode: { [statusCode: string]: ZodType<unknown>[] } = {}
        allResponses.forEach(([code, _, schema]) => {
            if (!byCode[code]) {
                byCode[code] = [schema]
            } else {
                byCode[code] = [...byCode[code], schema]
            }
        })

        const security = this.isProtectedPlayerRoute
            ? [
                  {
                      "Bearer Token": []
                  }
              ]
            : this.isAdministratorRoute
              ? [
                    {
                        "Administrator Token": []
                    }
                ]
              : undefined

        return [
            {
                path,
                deprecated: this.isDeprecated ? true : undefined,
                method: this.method,
                description: this.description,
                summary: this.getFullPath(),
                security,
                request: {
                    params: this.paramsSchema ?? undefined,
                    query: (this.querySchema as ZodObject<any>) ?? undefined,
                    body: this.bodySchema
                        ? {
                              required: true,
                              content: {
                                  "application/json": {
                                      schema: this.bodySchema
                                  }
                              }
                          }
                        : undefined
                },
                responses: Object.fromEntries(
                    Object.entries(byCode).map(([code, schemas]) => [
                        code,
                        {
                            description: allResponses.findLast(([c]) => c === Number(code))![1],
                            content: {
                                "application/json": {
                                    schema:
                                        schemas.length > 1
                                            ? z.union(
                                                  schemas as [
                                                      ZodTypeAny,
                                                      ZodTypeAny,
                                                      ...ZodTypeAny[]
                                                  ]
                                              )
                                            : schemas[0]
                                }
                            }
                        }
                    ])
                )
            }
        ]
    }

    // Used for testing to mock a request by passing the data directly to the handler
    async $mock(
        req: {
            params?: unknown
            query?: unknown
            body?: unknown
            headers?: IncomingHttpHeaders
        } = {}
    ): Promise<
        | {
              type: "ok"
              parsed: z.output<ResponseBody>
          }
        | {
              type: "err"
              code: ErrorCode
              parsed: ErrorResponse[number]["schema"]
          }
    > {
        let after: () => Promise<void> = () => Promise.resolve()
        const res = await this.handler(
            {
                params: this.paramsSchema?.parse(req.params) ?? {},
                query: this.querySchema?.parse(req.query ?? {}) ?? {},
                body: this.bodySchema?.parse(req.body) ?? {},
                headers: req.headers ?? {}
            },
            afterCallback => (after = afterCallback)
        ).then(this.buildResponse)

        await after()

        // We essentially can use this type to narrow down the type of res in our unit tests
        // This will guarantee that we are testing the correct type of response and that
        // also the shape matches the schema
        if (res.success) {
            return {
                type: "ok",
                parsed: this.responseSchema.parse(res.response) as z.output<ResponseBody>
            } as const
        } else {
            const schema =
                this.errors.length === 0
                    ? z.never()
                    : this.errors.length > 1
                      ? z.union(
                            this.errors.map(err => err.schema.strict()) as unknown as readonly [
                                ZodTypeAny,
                                ZodTypeAny,
                                ...ZodTypeAny[]
                            ]
                        )
                      : this.errors[0].schema.strict()
            return {
                type: "err",
                code: res.code,
                parsed: schema.parse(res.error)
            } as const
        }
    }
}
