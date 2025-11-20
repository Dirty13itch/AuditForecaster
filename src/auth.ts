import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"

export const { handlers, auth, signIn, signOut } = NextAuth({
    // adapter: PrismaAdapter(prisma),
    providers: [
        Credentials({
            // You can specify which fields should be submitted, by adding keys to the `credentials` object.
            // e.g. domain, username, password, 2FA token, etc.
            credentials: {
                email: {},
                password: {},
            },
            authorize: async (credentials) => {
                // TODO: Implement actual user verification logic here
                // For now, return a mock user
                if (credentials.email === "admin@ulrich.com" && credentials.password === "admin") {
                    return {
                        id: "1",
                        name: "Admin User",
                        email: "admin@ulrich.com",
                        role: "ADMIN",
                    }
                }
                return null
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub;
            }
            // Add role to session
            // Note: You might need to extend the Session type to include role
            return session;
        },
    },
})
