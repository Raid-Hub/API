import { RaidHubRoute } from "@/core/RaidHubRoute"
import { RaidHubRouter } from "@/core/RaidHubRouter"
import { IRaidHubRoute } from "@/core/RaidHubRouterTypes"
import { instanceRoute } from "@/routes/instance"
import { playerSearchRoute } from "@/routes/player/search"
import { ApplicationCommandOptionType } from "discord-api-types/v10"
import { z } from "zod"
import { signDiscordInvocationContext } from "./context-jwt"
import { DiscordApiStyleRequest, DiscordInteraction, DiscordInteractionDataOption } from "./types"

type AnyRaidHubRoute = RaidHubRoute<
    "get" | "post" | "patch" | "put" | "delete",
    z.ZodTypeAny,
    any,
    any,
    any,
    any
>

const discordEnabledRoutes = new Set<AnyRaidHubRoute>([instanceRoute, playerSearchRoute])

export type DiscordExposedRoute = {
    commandName: string
    route: AnyRaidHubRoute
    description: string
    routeId: string
}

const snakeCase = (input: string) =>
    input
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/[\s-]+/g, "_")
        .toLowerCase()

const commandNameFromPath = (fullPath: string) => {
    const segments = fullPath
        .split("/")
        .filter(Boolean)
        .filter(segment => !segment.startsWith(":"))
        .map(segment => segment.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase())
        .filter(Boolean)
    return (segments.join("-") || "command").slice(0, 32)
}

const commandDescriptionFromRoute = (description: string, commandName: string) => {
    const normalized = description.replace(/\s+/g, " ").trim()
    if (!normalized) return `Run ${commandName}`.slice(0, 100)
    return normalized.slice(0, 100)
}

const flattenRoutes = (node: IRaidHubRoute): AnyRaidHubRoute[] => {
    if (node instanceof RaidHubRoute) return [node as AnyRaidHubRoute]
    if (node instanceof RaidHubRouter) {
        return node.routes.flatMap(({ route }) =>
            Array.isArray(route)
                ? route.flatMap(child => flattenRoutes(child))
                : flattenRoutes(route)
        )
    }
    return []
}

export const collectDiscordExposedRoutes = (
    root: RaidHubRouter
): Map<string, DiscordExposedRoute> => {
    const routes = flattenRoutes(root)
    const exposed = routes
        .map(route => ({
            route,
            routeId: route.getDerivedRouteId()
        }))
        .filter(item => discordEnabledRoutes.has(item.route))

    const byCommand = new Map<string, DiscordExposedRoute>()
    for (const { route, routeId } of exposed) {
        const commandName = commandNameFromPath(route.getFullPath())
        byCommand.set(commandName, {
            commandName,
            route,
            routeId,
            description: commandDescriptionFromRoute(route.description, commandName)
        })
    }
    return byCommand
}

const flattenCommandOptions = (options: DiscordInteractionDataOption[] = []) => {
    const flattened: [string, string | number | boolean][] = []
    for (const option of options ?? []) {
        if (typeof option.value !== "undefined") {
            flattened.push([option.name, option.value])
        }
        if (option.options && option.options.length > 0) {
            flattened.push(...flattenCommandOptions(option.options))
        }
    }
    return flattened
}

const getCommandOptionMap = (interaction: DiscordInteraction) =>
    Object.fromEntries(flattenCommandOptions(interaction.data?.options))

const camelCase = (value: string) =>
    value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())

const getZodObjectShape = (schema: z.ZodTypeAny | null): Record<string, z.ZodTypeAny> => {
    if (!(schema instanceof z.ZodObject)) return {}
    return schema.shape as Record<string, z.ZodTypeAny>
}

const getRouteShapes = (route: AnyRaidHubRoute) => ({
    params: getZodObjectShape(route.paramsSchema),
    query: getZodObjectShape(route.querySchema),
    body: getZodObjectShape(route.bodySchema)
})

const inferOptionTarget = (
    route: AnyRaidHubRoute,
    field: string
): "params" | "query" | "body" => {
    const shapes = getRouteShapes(route)
    if (field in shapes.params) return "params"
    if (field in shapes.query) return "query"
    return "body"
}

export const buildRouteInvocationRequest = (
    interaction: DiscordInteraction,
    exposedRoute: DiscordExposedRoute,
    headers: Record<string, string> = {}
): DiscordApiStyleRequest => {
    const rawOptions = getCommandOptionMap(interaction)
    const params: Record<string, unknown> = {}
    const query: Record<string, unknown> = {}
    const body: Record<string, unknown> = {}

    for (const [optionName, value] of Object.entries(rawOptions)) {
        const field = camelCase(optionName)
        const target = inferOptionTarget(exposedRoute.route, field)

        if (target === "params") params[field] = value
        else if (target === "query") query[field] = value
        else body[field] = value
    }

    const contextJwt = signDiscordInvocationContext({
        interactionId: interaction.id,
        commandName: exposedRoute.commandName,
        routeId: exposedRoute.routeId,
        userId: interaction.member?.user?.id ?? "",
        guildId: interaction.guild_id,
        channelId: interaction.channel_id
    })

    return {
        params,
        query,
        body: Object.keys(body).length > 0 ? body : null,
        headers: {
            authorization: `Discord ${contextJwt}`,
            ...headers
        }
    }
}

export const deriveDiscordOptionNames = (route: AnyRaidHubRoute) => {
    return deriveDiscordCommandOptions(route).map(option => option.name)
}

type DiscordApplicationCommandOption = {
    type:
        | ApplicationCommandOptionType.String
        | ApplicationCommandOptionType.Integer
        | ApplicationCommandOptionType.Boolean
        | ApplicationCommandOptionType.Number
    name: string
    description: string
    required: boolean
}

const inferDiscordOptionType = (
    schema: z.ZodTypeAny
):
    | ApplicationCommandOptionType.String
    | ApplicationCommandOptionType.Integer
    | ApplicationCommandOptionType.Boolean
    | ApplicationCommandOptionType.Number => {
    let current = schema
    while (true) {
        if (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
            current = current.unwrap() as z.ZodTypeAny
            continue
        }
        if (current instanceof z.ZodDefault || current instanceof z.ZodCatch) {
            current = current._def.innerType as z.ZodTypeAny
            continue
        }
        if (current instanceof z.ZodEffects) {
            current = current.innerType()
            continue
        }
        break
    }

    if (current instanceof z.ZodBoolean) return ApplicationCommandOptionType.Boolean
    if (current instanceof z.ZodNumber) {
        return current.isInt
            ? ApplicationCommandOptionType.Integer
            : ApplicationCommandOptionType.Number
    }
    if (current instanceof z.ZodNativeEnum) {
        const values = Object.values(current.enum as Record<string, string | number>)
        if (values.some(value => typeof value === "number")) {
            return ApplicationCommandOptionType.Integer
        }
    }
    return ApplicationCommandOptionType.String
}

export const deriveDiscordCommandOptions = (
    route: AnyRaidHubRoute
): DiscordApplicationCommandOption[] => {
    const shapes = getRouteShapes(route)
    const options = new Map<string, DiscordApplicationCommandOption>()

    const addShapeOptions = (shape: Record<string, z.ZodTypeAny>) => {
        for (const [key, schema] of Object.entries(shape)) {
            const optionName = snakeCase(key).slice(0, 32)
            if (options.has(optionName)) continue
            options.set(optionName, {
                type: inferDiscordOptionType(schema),
                name: optionName,
                description: `Value for ${optionName}`.slice(0, 100),
                required: false
            })
        }
    }

    addShapeOptions(shapes.params)
    addShapeOptions(shapes.query)
    addShapeOptions(shapes.body)

    return [...options.values()]
}
