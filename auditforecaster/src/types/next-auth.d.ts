import { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session {
        accessToken?: string
        user: {
            id: string
            role: string
            refreshToken?: string
        } & DefaultSession["user"]
    }

    interface User {
        role: string
        refreshToken?: string
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: string
        accessToken?: string
        refreshToken?: string
        expiresAt?: number
    }
}
