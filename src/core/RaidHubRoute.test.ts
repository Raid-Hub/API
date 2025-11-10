import { beforeEach, describe, expect, mock, test } from "bun:test"

import { errorHandler } from "@/middleware/error-handler"
import { ErrorCode } from "@/schema/errors/ErrorCode"
import { zBigIntString, zDigitString } from "@/schema/input"
import { zInt64 } from "@/schema/output"

import express from "express"
import request from "supertest"
import { z } from "zod"

import { RaidHubRoute } from "./RaidHubRoute"

const app = express()

app.use(express.json())

const mockCallback = mock<(arg: number) => Promise<void>>()

const testGetRoute = new RaidHubRoute({
    method: "get",
    description: "test route",
    params: z
        .object({
            testId: zDigitString()
        })
        .strict(),
    query: z.object({
        hello: z.string().optional(),
        count: z.coerce.number()
    }),
    handler: async ({ query }, after) => {
        after(() => mockCallback(query.count ** 2))
        return RaidHubRoute.ok({
            woo: "hoo"
        })
    },
    response: {
        success: {
            statusCode: 200,
            schema: z
                .object({
                    woo: z.string()
                })
                .strict()
        },
        errors: [
            {
                code: ErrorCode.PlayerNotFoundError,
                statusCode: 404,
                schema: z.object({
                    playerId: zInt64()
                })
            },
            {
                code: ErrorCode.InstanceNotFoundError,
                statusCode: 404,
                schema: z.object({
                    activityId: zBigIntString()
                })
            }
        ]
    }
})

const testPostRoute = new RaidHubRoute({
    method: "post",
    description: "test post route",
    body: z.object({
        hello: z.string().optional(),
        count: z.coerce.number()
    }),
    query: z
        .object({
            id: z.string().optional()
        })
        .strict(),
    handler: async args => {
        return RaidHubRoute.ok({
            posted: { ...args.query, ...args.body, data: { value: "destiny 2" } }
        })
    },
    response: {
        success: {
            statusCode: 200,
            schema: z
                .object({
                    posted: z.object({
                        id: z.string().optional(),
                        hello: z.string().optional()
                    })
                })
                .strict()
        }
    }
})

const testEmptyRoute = new RaidHubRoute({
    method: "get",
    description: "test empty route",
    handler: async () => {
        return RaidHubRoute.ok({
            game: "destiny 2" as const
        })
    },
    response: {
        success: {
            statusCode: 200,
            schema: z.object({
                game: z.literal("destiny 2")
            })
        }
    }
})

const testFailRoute = new RaidHubRoute({
    method: "get",
    description: "test fail route",
    query: z.object({
        fail: z.string().optional()
    }),
    handler: async args => {
        if (args.query.fail === "d2") {
            throw new Error("bad game")
        }
        return RaidHubRoute.ok({
            game: "destiny 2" as const
        })
    },
    response: {
        success: {
            statusCode: 200,
            schema: z.object({
                game: z.literal("destiny 2")
            })
        }
    }
})

app.use("/test/", testEmptyRoute.express)
app.use("/test/post", testPostRoute.express)
app.use("/test/fail", testFailRoute.express)
app.use("/test/:testId", testGetRoute.express)

app.use(errorHandler)

beforeEach(() => {
    mockCallback.mockClear()
})

describe("raidhub route middleware validators", () => {
    test("body is right shape", async () => {
        const res = await request(app).get("/test/123").query({ hello: "world" })
        expect(res.body).toHaveProperty("error")
        expect(res.body).toHaveProperty("minted")
        const minted = new Date(res.body.minted).getTime()
        expect(minted).toBeLessThanOrEqual(Date.now())
        expect(minted).toBeGreaterThanOrEqual(Date.now() - 5000)
        expect(res.body.success).toBe(false)
    })

    test("fails query parsing", async () => {
        const res = await request(app).get("/test/123").query({ hello: "world", yolo: 2 })
        expect(res.body.code).toBe("QueryValidationError")
        expect(res.body.error).toHaveProperty("issues")
        expect(res.body.error.issues).toHaveProperty("0")
        expect(res.body.error.issues[0].path).toEqual(["count"])
        expect(res.status).toBe(400)
    })

    test("fails params parsing", async () => {
        const res = await request(app).get("/test/abc").query({ count: 5, hello: "sup" })
        expect(res.body.code).toBe("PathValidationError")
        expect(res.body.error).toHaveProperty("issues")
        expect(res.body.error.issues).toHaveProperty("0")
        expect(res.body.error.issues[0].path).toEqual(["testId"])
        expect(res.status).toBe(404)
    })

    test("fails body parsing", async () => {
        const res = await request(app)
            .post("/test/post")
            .query({ id: "124" })
            .send(
                JSON.stringify({
                    hello: "world",
                    data: {
                        value: 2812
                    }
                })
            )
        expect(res.body.code).toBe("BodyValidationError")
        expect(res.body.error).toHaveProperty("issues")
        expect(res.body.error.issues).toHaveProperty("0")
        expect(res.body.error.issues[0].path).toEqual(["count"])
    })

    test("passes parsing empty", async () => {
        const res = await request(app).get("/test")
        expect(res.body).toMatchObject({
            success: true,
            response: {
                game: "destiny 2"
            }
        })
        expect(res.status).toBe(200)
    })

    test("passes parsing get", async () => {
        const res = await request(app).get("/test/123").query({ count: 10 })
        expect(res.body).toMatchObject({
            success: true,
            response: {
                woo: "hoo"
            }
        })
        expect(res.status).toBe(200)
    })

    test("passes parsing post", async () => {
        const res = await request(app)
            .post("/test/post")
            .query({ id: "hyfasfaa" })
            .send({
                hello: "world",
                count: "2",
                data: {
                    value: 2812
                }
            })

        expect(res.body).toMatchObject({
            success: true,
            response: {
                posted: {
                    id: "hyfasfaa",
                    hello: "world",
                    data: {
                        value: "destiny 2"
                    }
                }
            }
        })
        expect(res.status).toBe(200)
    })
})

describe("after callback", () => {
    test("after callback called", async () => {
        await request(app).get("/test/123").query({ count: 10 })

        expect(mockCallback).toHaveBeenCalledTimes(1)
        expect(mockCallback).toHaveBeenCalledWith(100)
    })
})

describe("raidhub route unhandled error", () => {
    test("unhandled error thrown ", async () => {
        const res = await request(app).get("/test/fail").query({ fail: "d2" })

        expect(res.body.code).toBe("InternalServerError")
    })

    test("no error thrown ", async () => {
        const res = await request(app).get("/test/fail")
        expect(res.body.response).toMatchObject({
            game: "destiny 2"
        })
    })
})

describe("test raidhub route openapi gen", () => {
    test("get schema", () => {
        const openapi = testGetRoute.$generateOpenApiRoutes()[0]
        expect(openapi.method).toBe("get")
        expect(openapi.description).toBe("test route")
        expect(openapi.path).toBe("/")
        expect(openapi.request.params).toBeDefined()
        expect(openapi.request.query).toBeDefined()
        expect(openapi.request.body).toBeUndefined()
        expect(openapi.responses).toHaveProperty("200")
        expect(openapi.responses).toHaveProperty("400")
        expect(openapi.responses).toHaveProperty("404")
    })

    test("post schema", () => {
        const openapi = testPostRoute.$generateOpenApiRoutes()[0]
        expect(openapi.method).toBe("post")
        expect(openapi.path).toBe("/")
        expect(openapi.request.params).toBeUndefined()
        expect(openapi.request.query).toBeDefined()
        expect(openapi.request.body).toBeDefined()
        expect(openapi.responses).toHaveProperty("200")
        expect(openapi.responses).toHaveProperty("400")
    })

    test("empty schema", () => {
        const openapi = testEmptyRoute.$generateOpenApiRoutes()[0]
        expect(openapi.method).toBe("get")
        expect(openapi.path).toBe("/")
        expect(openapi.request.params).toBeUndefined()
        expect(openapi.request.query).toBeUndefined()
        expect(openapi.request.body).toBeUndefined()
        expect(openapi.responses).toHaveProperty("200")
    })
})
