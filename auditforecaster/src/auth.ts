import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import type { User } from "@prisma/client"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"
import { env } from "@/lib/env"
import { logger } from "@/lib/logger"

async function getUser(email: string): Promise<User | undefined> {
    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });
        return user || undefined;
    } catch (error) {
        logger.error('Failed to fetch user', { error, email });
        throw new Error('Failed to fetch user.');
    }
}


const nextAuthResult = NextAuth({
    ...authConfig,
    trustHost: true,
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                    scope: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/photoslibrary"
                }
            }
        }),
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    const user = await getUser(email);

                    if (!user || !user.passwordHash) return null;

                    const passwordsMatch = await bcrypt.compare(password, user.passwordHash);

                    if (passwordsMatch) return user;
                }

                return null;
            },
        }),
    ],
    callbacks: {
        ...authConfig.callbacks,
        async session({ session, token }) {
            // Add role to session
            if (token.sub && session.user) {
                session.user.id = token.sub
                const user = await prisma.user.findUnique({ where: { id: token.sub } })
                if (user) {
                    session.user.role = user.role
                    session.user.builderId = user.builderId
                }
            }
            // Add access token to session for API calls
            if (token.accessToken) {
                session.accessToken = token.accessToken as string
            }
            return session
        },
        async jwt({ token, user, account }) {
            if (user) {
                token.role = user.role
            }
            // Persist the access_token and refresh_token to the token
            if (account) {
                token.accessToken = account.access_token
                token.refreshToken = account.refresh_token
                token.expiresAt = account.expires_at
            }
            return token
        }
    },
})

export const { handlers, signIn, signOut } = nextAuthResult

// Wrap auth to support E2E mocking
// Wrap auth to support E2E mocking
export const auth = async (...args: any[]) => {
    if (process.env.MOCK_AUTH_FOR_E2E === 'true') {
        return {
            user: {
                name: 'E2E Admin',
                email: 'admin@example.com',
                role: 'ADMIN',
                id: 'e2e-admin-id',
                builderId: 'e2e-test-builder'
            },
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
    }
    return (nextAuthResult.auth as any)(...args)
}

export { nextAuthResult }
