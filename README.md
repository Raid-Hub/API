# Docs

https://api-docs.raidhub.io

# Contributing

If you notice a bug or want to fix something in the API, please fork the repo and create a PR
New features are harder to add because they might rely on data we do not have, but you are welcome to draft a PR and we will see what we can do.

# Running the API locally

Note: you will need to clone the [RaidHub-Services](https://github.com/Raid-Hub/RaidHub-Services) repository to connect to the database

### Local database

1. Clone the services repo
2. In the new cloned repo, run `cp example.env .env` and make any changes
3. Install [Docker desktop](https://www.docker.com/products/docker-desktop/)
4. Run `make postgres`

### Turning the API On

1. Run `cp example.env .env` and make any changes
2. Copy `api-keys.example.json` to `api-keys.json` and set at least one `key` (use `origin` `"*"` for local tools such as **raidhub-discord**). Point `API_KEYS_PATH` in `.env` at that file (defaults to `./api-keys.json`).
3. Run `bun dev`
4. By default the API is available at `http://localhost:8000`

With `PROD=true`, every request must include a valid `x-api-key` header matching an entry in `api-keys.json`.

### Open API

You can regenerate the Open API schema doc with `bun docs`

### Testing

Static linting and typescript compliation checks can be run with `bun lint` and `bun types` respectively. Running integration tests locally is not yet fully supported, but you can run basic unit tests with `bun:test`

## Resources and Tools

-   TypeScript https://www.typescriptlang.org/docs/
-   Express.js (Framework) https://expressjs.com/
-   Bun (Runtime & Package manager) https://bun.sh/docs
-   Zod (Schema Validation) https://zod.dev/
-   Zod to OpenAPI https://github.com/asteasolutions/zod-to-openapi
-   postgrejs https://www.npmjs.com/package/postgrejs
