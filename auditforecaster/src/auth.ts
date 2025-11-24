
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import type { User } from "@prisma/client"
import bcrypt from "bcryptjs"

async function getUser(email: string): Promise<User | undefined> {
    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });
        return user || undefined;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw new Error('Failed to fetch user.');
    }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
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

                console.log('Invalid credentials');
                return null;
            },
        }),
    ],
    callbacks: {
        async session({ session, token }) {
            // Add role to session
            if (token.sub && session.user) {
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
    pages: {
        signIn: '/login',
    },
})
