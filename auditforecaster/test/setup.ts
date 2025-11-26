import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
        back: vi.fn(),
    }),
    useSearchParams: () => ({
        get: vi.fn(),
    }),
    usePathname: () => '',
}))

// Mock Next.js cache
vi.mock('next-auth', () => {
    console.log('SETUP: Mocking next-auth')
    const auth = vi.fn()
        ; (auth as any)._id = 'GLOBAL_MOCK_AUTH'
    const handlers = { GET: vi.fn(), POST: vi.fn() }
    const signIn = vi.fn()
    const signOut = vi.fn()

    const NextAuth = vi.fn(() => ({
        auth,
        handlers,
        signIn,
        signOut,
    }))

    return {
        default: NextAuth,
        auth,
        signIn,
        signOut,
    }
})

// Mock Prisma
import { mockDeep, mockReset } from 'vitest-mock-extended'
import { PrismaClient } from '@prisma/client'

vi.mock('@/lib/prisma', () => ({
    prisma: mockDeep<PrismaClient>(),
}))

beforeEach(() => {
    mockReset(mockDeep<PrismaClient>())
})

// Mock Logger
vi.mock('@/lib/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }
}))
