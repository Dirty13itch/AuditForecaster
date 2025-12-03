import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { checkRateLimit } from '@/lib/security';

const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
    const isLoggedIn = !!req.auth;
    const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard');
    const isRoot = req.nextUrl.pathname === '/';

    console.log('Middleware:', {
        path: req.nextUrl.pathname,
        isLoggedIn,
        mockAuth: process.env.MOCK_AUTH_FOR_E2E,
        auth: req.auth
    });

    // Initialize response
    let response = NextResponse.next();

    // Bypass Auth for E2E Tests (Development Only)
    if (process.env.NODE_ENV === 'development' && req.headers.get('x-e2e-bypass-auth') === 'true') {
        return response;
    }

    if (isOnDashboard) {
        if (isLoggedIn) {
            response = NextResponse.next();
        } else {
            const url = new URL('/login', req.nextUrl);
            url.searchParams.set('callbackUrl', req.nextUrl.pathname);
            return NextResponse.redirect(url);
        }
    } else if (isRoot && isLoggedIn) {
        // Redirect authenticated users from Landing Page to Dashboard
        return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
    } else if (isLoggedIn && req.nextUrl.pathname === '/login') {
        return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
    }

    // Rate limiting logic for API
    if (req.nextUrl.pathname.startsWith('/api')) {
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        const type = isLoggedIn ? 'authenticated' : 'public';

        const { success, limit, remaining, reset } = await checkRateLimit(ip, type);

        if (!success) {
            return new NextResponse('Too Many Requests', {
                status: 429,
                headers: {
                    'X-RateLimit-Limit': limit.toString(),
                    'X-RateLimit-Remaining': remaining.toString(),
                    'X-RateLimit-Reset': reset.toString(),
                }
            });
        }
    }

    // Add Security Headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=(self)'
    );
    response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
    );
    response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
    );

    return response;
});

export const config = {
    // Matcher ignoring static files and images
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
