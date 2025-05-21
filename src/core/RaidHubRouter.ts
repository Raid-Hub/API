import { RouteConfig } from "@asteasolutions/zod-to-openapi"
import { RequestHandler, Router } from "express"
import { IRaidHubRoute } from "./RaidHubRouterTypes"

export type RaidHubPath = {
    path: string
    route: IRaidHubRoute
}

export class RaidHubRouter implements IRaidHubRoute {
    private parent: RaidHubRouter | null = null
    readonly routes: RaidHubPath[]
    readonly middlewares: RequestHandler[]
    constructor(args: { middlewares?: RequestHandler[]; routes: RaidHubPath[] }) {
        this.middlewares = args.middlewares ?? []
        this.routes = args.routes
        this.routes.forEach(({ route }) => {
            route.setParent(this)
        })
    }

    get express() {
        const router = Router({ strict: true, mergeParams: true })
        this.middlewares.forEach(middleware => {
            router.use(middleware)
        })
        this.routes.forEach(({ path, route }) => {
            router.use(path, route.express)
        })
        return router
    }

    getFullPath(child: IRaidHubRoute): string {
        const path = this.routes.find(({ route }) => route === child)?.path
        if (!path) throw new Error("Child not found")

        return (this.parent ? this.parent.getFullPath(this) : "") + path
    }

    $generateOpenApiRoutes(): RouteConfig[] {
        return this.routes.flatMap(({ route }) => route.$generateOpenApiRoutes())
    }

    setParent(parent: RaidHubRouter) {
        this.parent = parent
    }

    getParent(): RaidHubRouter | null {
        return this.parent
    }
}
