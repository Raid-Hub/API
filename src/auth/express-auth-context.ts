import type { JWTAuthContext } from "./jwt"

declare global {
    namespace Express {
        interface Request {
            auth?: JWTAuthContext
        }
    }
}

export {}
