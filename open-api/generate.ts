import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi"
import { exec } from "child_process"
import { writeFile } from "fs"
import { router } from "../src/routes"
import { registry } from "../src/schema"

const dir = "./open-api"
const fileName = dir + "/openapi.json"

console.log("Generating OpenAPI spec...")

router.$generateOpenApiRoutes().forEach(route => registry.registerPath(route))

const doc = new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: "3.0.0",
    info: {
        title: "RaidHub API",
        description: "The Semi-public API for RaidHub",
        version: "1.2.0",
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
