'use server'

import { signIn } from '@/auth'
import { AuthError } from 'next-auth'
import { logger } from '@/lib/logger'

import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/security'
import { sendEmail } from './email'

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

        await signIn('credentials', {
            email,
            password,
            redirectTo: callbackUrl
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

    // Send password reset email
    await sendEmail({
        to: email,
        subject: 'Password Reset Request',
        body: `
            Password Reset Request
            
            Someone requested a password reset for your account.
            If this was you, please click the link below to reset your password:
            
            ${process.env.NEXTAUTH_URL}/reset-password?token=mock-token
            
            If you did not request this, please ignore this email.
        `
    })

    logger.info(`Password reset requested`, { email })

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    return {
        success: true,
        message: 'If an account exists with that email, we have sent a password reset link.',
        error: undefined
    }
}
