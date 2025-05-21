import { apiVersion } from "@/core/version"
import { router } from "@/routes/index"
import { registry } from "@/schema/registry"
import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi"
import { exec } from "child_process"
import { writeFile } from "fs"

const dir = "./open-api"
const fileName = dir + "/openapi.json"

console.log("Generating OpenAPI spec...")

router.$generateOpenApiRoutes().forEach(route => registry.registerPath(route))

const doc = new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: "3.0.0",
    info: {
        title: "RaidHub API",
        description: "The Semi-public API for RaidHub",
        version: apiVersion,
        contact: {
            name: "RaidHub Admin",
            email: "admin@raidhub.io"
        }
    },
    servers: [{ url: "https://api.raidhub.io" }],
    security: [{ "API Key": [] }]
})

doc.components!.securitySchemes = {
    "API Key": {
        type: "apiKey",
        name: "X-API-KEY",
        in: "header"
    },
    "Bearer Token": {
        type: "http",
        name: "Authorization",
        scheme: "bearer",
        in: "header"
    },
    "Administrator Token": {
        type: "http",
        name: "Authorization",
        scheme: "bearer",
        in: "header"
    }
}

// Fixes some weird behavior where allOf with nullable: true is not being handled correctly
const fixAllOfNullable = (schema: unknown) => {
    if (!schema || typeof schema !== "object" || "$ref" in schema) return

    if ("allOf" in schema && Array.isArray(schema["allOf"])) {
        schema["allOf"] = schema["allOf"]!.filter(item => {
            if ("nullable" in item && item.nullable === true) {
                Object.entries(item).forEach(([k, v]) => {
                    // @ts-expect-error Generic object
                    schema[k] = v
                })
                return false
            }
            return true
        })
    } else {
        Object.values(schema).forEach(child => {
            fixAllOfNullable(child)
        })
    }
}

fixAllOfNullable(doc.components)

console.log("Writing OpenAPI docs...")
const redocOpts = JSON.stringify({})
writeFile("open-api/openapi.json", JSON.stringify(doc, null, 2), err => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log("Formatting OpenAPI docs...")
    exec(`prettier --write ${fileName}`, err => {
        if (err) {
            console.error(err)
            process.exit(1)
        }

        console.log("Generating static HTML docs...")
        exec(`redoc-cli bundle -o ${dir}/index.html ${fileName} --options='${redocOpts}'`, err => {
            if (err) {
                console.error(err)
                process.exit(1)
            }
            console.log("Done.")
            process.exit(0)
        })
    })
})
