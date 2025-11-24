import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
            const userRole = (auth?.user as { role?: string })?.role;

            if (isOnDashboard) {
                if (isLoggedIn) {
                    // Role-based protection
                    const path = nextUrl.pathname;

                    // Admin only routes
                    if (path.startsWith('/dashboard/team') ||
                        path.startsWith('/dashboard/finances')) {
                        return userRole === 'ADMIN';
                    }

                    // QA and Admin routes
                    if (path.startsWith('/dashboard/qa') ||
                        path.startsWith('/dashboard/reports/templates')) {
                        return userRole === 'ADMIN' || userRole === 'QA';
                    }

                    // Builder routes
                    if (path.startsWith('/dashboard/builder')) {
                        return userRole === 'ADMIN' || userRole === 'BUILDER';
                    }

                    return true;
                }
                return false; // Redirect unauthenticated users to login page
            } else if (isLoggedIn) {
                // Redirect logged-in users away from login page to dashboard
                if (nextUrl.pathname === '/login') {
                    return Response.redirect(new URL('/dashboard', nextUrl));
                }
            }
            return true;
        },
    },
    providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
