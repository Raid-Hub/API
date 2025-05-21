import "@/lib/extensions"
import compression from "compression"
import express, { Router, static as expressStatic, json } from "express"
import path from "path"
import { verifyApiKey } from "./auth/api-keys"
import { servePrometheus } from "./integrations/prometheus/server"
import { errorHandler } from "./middleware/error-handler"
import { router } from "./routes"

const port = Number(process.env.PORT || 8000)

const app = express()

if (!process.env.PROD) {
    // serve static files for development
    const staticRouter = Router()
    app.use("/static", staticRouter)
    staticRouter.use("/docs", expressStatic(path.join(__dirname, "..", "open-api", "index.html")))
    staticRouter.use(
        "/openapi",
        expressStatic(path.join(__dirname, "..", "open-api", "openapi.json"))
    )
    staticRouter.use(
        "/coverage",
        expressStatic(path.join(__dirname, "..", "coverage", "index.html"))
    )
}

// handle OPTIONS pre-flight requests before any other middleware
app.options("*", (req, res) => {
    if (req.path.startsWith("/admin")) {
        res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,OPTIONS")
    } else {
        res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    }
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "*")
    res.sendStatus(204)
})

// parse incoming request body with json, apply the router, handle any uncaught errors
app.use(verifyApiKey, json(), compression(), router.express, errorHandler)

// Start the server
app.listen(port, () => {
    console.log("Express server started on port: " + port)
    servePrometheus()
})
