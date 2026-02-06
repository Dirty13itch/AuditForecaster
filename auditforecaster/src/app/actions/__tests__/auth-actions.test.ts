import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authenticate, resetPassword } from '../auth'
import { prisma } from '@/lib/prisma'

// Mock dependencies
vi.mock('@/auth', () => ({
    auth: vi.fn(),
    signIn: vi.fn()
}))

import { signIn } from '@/auth'

vi.mock('next-auth', () => {
    class AuthError extends Error {
        type: string
        constructor(message: string) {
            super(message)
            this.name = 'AuthError'
            this.type = ''
        }
    }
    return { AuthError }
})

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}))

vi.mock('next/headers', () => ({
    headers: vi.fn().mockResolvedValue({
        get: vi.fn().mockReturnValue('127.0.0.1')
    })
}))

vi.mock('@/lib/security', () => ({
    checkRateLimit: vi.fn().mockResolvedValue({ success: true })
}))

import { checkRateLimit } from '@/lib/security'

vi.mock('@/lib/rate-limit', () => ({
    authLimiter: vi.fn().mockResolvedValue({ success: true })
}))

import { authLimiter } from '@/lib/rate-limit'

vi.mock('../email', () => ({
    sendEmail: vi.fn().mockResolvedValue(undefined)
}))

import { sendEmail } from '../email'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: vi.fn()
        },
        verificationToken: {
            create: vi.fn()
        }
    }
}))

describe('Auth Server Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(checkRateLimit).mockResolvedValue({ success: true } as any)
        vi.mocked(authLimiter).mockResolvedValue({ success: true, remaining: 9, reset: Date.now() + 900000 })
    })

    describe('authenticate', () => {
        it('should call signIn with correct credentials', async () => {
            const formData = new FormData()
            formData.set('email', 'test@example.com')
            formData.set('password', 'password123')
            formData.set('callbackUrl', '/dashboard')

            vi.mocked(signIn as any).mockResolvedValue(undefined)

            await authenticate(undefined, formData)

            expect(signIn).toHaveBeenCalledWith('credentials', {
                email: 'test@example.com',
                password: 'password123',
                redirectTo: '/dashboard'
            })
        })

        it('should use default callbackUrl when none provided', async () => {
            const formData = new FormData()
            formData.set('email', 'test@example.com')
            formData.set('password', 'password123')

            vi.mocked(signIn as any).mockResolvedValue(undefined)

            await authenticate(undefined, formData)

            expect(signIn).toHaveBeenCalledWith('credentials', {
                email: 'test@example.com',
                password: 'password123',
                redirectTo: '/dashboard'
            })
        })

        it('should sanitize unsafe callbackUrl to prevent open redirect', async () => {
            const formData = new FormData()
            formData.set('email', 'test@example.com')
            formData.set('password', 'password123')
            formData.set('callbackUrl', '//evil.com')

            vi.mocked(signIn as any).mockResolvedValue(undefined)

            await authenticate(undefined, formData)

            expect(signIn).toHaveBeenCalledWith('credentials', expect.objectContaining({
                redirectTo: '/dashboard'
            }))
        })

        it('should return error on CredentialsSignin', async () => {
            const { AuthError } = await import('next-auth')
            const error = new AuthError('Invalid')
            error.type = 'CredentialsSignin'
            vi.mocked(signIn as any).mockRejectedValue(error)

            const formData = new FormData()
            formData.set('email', 'test@example.com')
            formData.set('password', 'wrong')

            const result = await authenticate(undefined, formData)

            expect(result).toBe('Invalid credentials.')
        })

        it('should return rate limit message when IP rate limited', async () => {
            vi.mocked(checkRateLimit).mockResolvedValue({ success: false } as any)

            const formData = new FormData()
            formData.set('email', 'test@example.com')
            formData.set('password', 'password123')

            const result = await authenticate(undefined, formData)

            expect(result).toBe('Too many requests. Please try again later.')
        })

        it('should return rate limit message when email rate limited', async () => {
            vi.mocked(authLimiter).mockResolvedValue({ success: false, remaining: 0, reset: Date.now() + 900000 })

            const formData = new FormData()
            formData.set('email', 'test@example.com')
            formData.set('password', 'password123')

            const result = await authenticate(undefined, formData)

            expect(result).toBe('Too many login attempts. Please try again later.')
        })

        it('should re-throw non-AuthError errors', async () => {
            vi.mocked(signIn as any).mockRejectedValue(new Error('Network error'))

            const formData = new FormData()
            formData.set('email', 'test@example.com')
            formData.set('password', 'password123')

            await expect(authenticate(undefined, formData)).rejects.toThrow('Network error')
        })
    })

    describe('resetPassword', () => {
        it('should return generic response when user exists', async () => {
            vi.mocked(prisma.user.findUnique as any).mockResolvedValue({
                id: 'cm0000000000000000user001',
                email: 'test@example.com'
            })
            vi.mocked(prisma.verificationToken.create as any).mockResolvedValue({})
            vi.mocked(sendEmail as any).mockResolvedValue(undefined)

            const formData = new FormData()
            formData.set('email', 'test@example.com')

            const result = await resetPassword(undefined, formData)

            expect(result).toEqual({
                success: true,
                message: 'If an account exists with that email, we have sent a password reset link.',
                error: undefined
            })
            expect(prisma.verificationToken.create).toHaveBeenCalled()
            expect(sendEmail).toHaveBeenCalled()
        })

        it('should return same generic response when user does not exist (prevents enumeration)', async () => {
            vi.mocked(prisma.user.findUnique as any).mockResolvedValue(null)

            const formData = new FormData()
            formData.set('email', 'nonexistent@example.com')

            const result = await resetPassword(undefined, formData)

            expect(result).toEqual({
                success: true,
                message: 'If an account exists with that email, we have sent a password reset link.',
                error: undefined
            })
            expect(prisma.verificationToken.create).not.toHaveBeenCalled()
            expect(sendEmail).not.toHaveBeenCalled()
        })

        it('should return error when IP rate limited', async () => {
            vi.mocked(checkRateLimit).mockResolvedValue({ success: false } as any)

            const formData = new FormData()
            formData.set('email', 'test@example.com')

            const result = await resetPassword(undefined, formData)

            expect(result).toEqual({
                success: false,
                message: 'Too many requests. Please try again later.',
                error: 'Rate limit exceeded'
            })
        })

        it('should return error when email rate limited', async () => {
            vi.mocked(authLimiter).mockResolvedValue({ success: false, remaining: 0, reset: Date.now() + 900000 })

            const formData = new FormData()
            formData.set('email', 'test@example.com')

            const result = await resetPassword(undefined, formData)

            expect(result).toEqual({
                success: false,
                message: 'Too many password reset attempts. Please try again later.',
                error: 'Rate limit exceeded'
            })
        })

        it('should return generic response even when internal error occurs', async () => {
            vi.mocked(prisma.user.findUnique as any).mockResolvedValue({
                id: 'cm0000000000000000user001',
                email: 'test@example.com'
            })
            vi.mocked(prisma.verificationToken.create as any).mockRejectedValue(new Error('DB error'))

            const formData = new FormData()
            formData.set('email', 'test@example.com')

            const result = await resetPassword(undefined, formData)

            expect(result).toEqual({
                success: true,
                message: 'If an account exists with that email, we have sent a password reset link.',
                error: undefined
            })
        })
    })
})
