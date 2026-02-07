import 'server-only'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// Configure Prisma Client with production-ready settings
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    // Connection pool configuration is set via DATABASE_URL query params:
    // ?connection_limit=10&pool_timeout=20
})

// Prevent multiple instances in development (hot reload)
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
}

// Graceful shutdown handler
async function handleShutdown() {
    await prisma.$disconnect()
}

// Handle process termination
if (typeof process !== 'undefined') {
    process.on('beforeExit', handleShutdown)
}
