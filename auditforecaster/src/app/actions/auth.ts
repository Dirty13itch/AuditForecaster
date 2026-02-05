'use server'

import { signIn } from '@/auth'
import { AuthError } from 'next-auth'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/security'
import { sendEmail } from './email'
import { prisma } from '@/lib/prisma'

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    const ip = (await headers()).get('x-forwarded-for') || 'unknown'
    const { success } = await checkRateLimit(ip, 'public')
    if (!success) return 'Too many requests. Please try again later.'

    try {
        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const callbackUrl = formData.get('callbackUrl') as string || '/dashboard'

        // Validate callbackUrl is a relative path to prevent open redirect
        const safeCallbackUrl = callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')
            ? callbackUrl
            : '/dashboard'

        await signIn('credentials', {
            email,
            password,
            redirectTo: safeCallbackUrl
        })
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.'
                default:
                    return 'Something went wrong.'
            }
        }
        throw error
    }
}

export async function resetPassword(
    prevState: { success?: boolean; message?: string; error?: string } | undefined,
    formData: FormData,
) {
    const ip = (await headers()).get('x-forwarded-for') || 'unknown'
    const { success } = await checkRateLimit(ip, 'public')

    if (!success) {
        return {
            success: false,
            message: 'Too many requests. Please try again later.',
            error: 'Rate limit exceeded'
        }
    }

    const email = formData.get('email') as string

    // Always return the same response to prevent email enumeration
    const genericResponse = {
        success: true,
        message: 'If an account exists with that email, we have sent a password reset link.',
        error: undefined
    }

    try {
        // Verify user exists before generating token
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
            return genericResponse
        }

        // Generate a cryptographically secure token
        const token = crypto.randomBytes(32).toString('hex')
        const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiry

        // Store token in VerificationToken table
        await prisma.verificationToken.create({
            data: {
                identifier: email,
                token,
                expires,
            }
        })

        // Send password reset email with real token
        await sendEmail({
            to: email,
            subject: 'Password Reset Request',
            body: `
                Password Reset Request

                Someone requested a password reset for your account.
                If this was you, please click the link below to reset your password:

                ${process.env.NEXTAUTH_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}

                This link expires in 1 hour.

                If you did not request this, please ignore this email.
            `
        })

        logger.info('Password reset requested', { email })
    } catch (error) {
        logger.error('Password reset error', { error })
    }

    return genericResponse
}
