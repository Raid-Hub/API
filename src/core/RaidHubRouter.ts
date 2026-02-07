import { RouteConfig } from "@asteasolutions/zod-to-openapi"
import { RequestHandler, Router } from "express"
import { IRaidHubRoute, RaidHubHttpMethod } from "./RaidHubRouterTypes"

export type RaidHubPath = {
    path: string
    route: IRaidHubRoute | IRaidHubRoute[]
}

function normalizeRoute(route: IRaidHubRoute | IRaidHubRoute[]): IRaidHubRoute[] {
    return Array.isArray(route) ? route : [route]
}

export class RaidHubRouter implements IRaidHubRoute {
    private parent: RaidHubRouter | null = null
    readonly routes: RaidHubPath[]
    readonly middlewares: RequestHandler[]
    constructor(args: { middlewares?: RequestHandler[]; routes: RaidHubPath[] }) {
        this.middlewares = args.middlewares ?? []
        this.routes = args.routes
        this.routes.forEach(({ path, route }) => {
            const routes = normalizeRoute(route)
            routes.forEach(r => r.setParent(this))
            const methods: RaidHubHttpMethod[] = routes
                .map(r => ("method" in r && r.method ? r.method : null))
                .filter((m): m is RaidHubHttpMethod => m != null)
            const seen = new Set<RaidHubHttpMethod>()
            for (const m of methods) {
                if (seen.has(m)) {
                    throw new Error(`Duplicate method ${m.toUpperCase()} for path ${path}`)
                }
                seen.add(m)
            }
        })
    }

    get mountable() {
        const router = Router({ strict: true, mergeParams: true })
        this.middlewares.forEach(middleware => {
            router.use(middleware)
        })
        this.routes.forEach(({ path, route }) => {
            for (const r of normalizeRoute(route)) {
                router.use(path, r.mountable)
            }
        })
        return router
    }

    getFullPath(child: IRaidHubRoute): string {
        const path = this.routes.find(({ route }) =>
            normalizeRoute(route).includes(child)
        )?.path
        if (!path) throw new Error("Child not found")

        return (this.parent ? this.parent.getFullPath(this) : "") + path
    }

    $generateOpenApiRoutes(): RouteConfig[] {
        return this.routes.flatMap(({ route }) =>
            normalizeRoute(route).flatMap(r => r.$generateOpenApiRoutes())
        )
    }

    setParent(parent: RaidHubRouter) {
        this.parent = parent
    }

    getParent(): RaidHubRouter | null {
        return this.parent
    }
}
