import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

import { env } from '@/lib/env';

const { auth } = NextAuth(authConfig);

// Initialize Redis if credentials exist
const redis = (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN)
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

// Initialize Ratelimit if Redis exists
const ratelimit = redis
    ? new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(100, '60 s'), // 100 requests per minute
        analytics: true,
    })
    : null;

// Fallback in-memory rate limiter
const memoryRateLimit = new Map<string, { count: number; lastReset: number }>();
const WINDOW_SIZE = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100;

export default auth(async (req) => {
    const isLoggedIn = !!req.auth;
    const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard');


    // Initialize response
    let response = NextResponse.next();

    if (isOnDashboard) {
        if (isLoggedIn) {
            response = NextResponse.next();
        } else {
            return NextResponse.redirect(new URL('/api/auth/signin', req.nextUrl));
        }
    } else if (isLoggedIn && req.nextUrl.pathname === '/login') {
        return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
    }

    // Rate limiting logic for API
    if (req.nextUrl.pathname.startsWith('/api')) {
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

        if (ratelimit) {
            // Use Redis Rate Limiter
            const { success, limit, reset, remaining } = await ratelimit.limit(ip);

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
        } else {
            // Fallback to In-Memory
            const now = Date.now();
            const record = memoryRateLimit.get(ip) || { count: 0, lastReset: now };

            if (now - record.lastReset > WINDOW_SIZE) {
                record.count = 0;
                record.lastReset = now;
            }

            record.count++;
            memoryRateLimit.set(ip, record);

            if (record.count > MAX_REQUESTS) {
                return new NextResponse('Too Many Requests', { status: 429 });
            }
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
