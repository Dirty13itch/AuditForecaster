'use client'

import { useActionState } from 'react'
import { resetPassword } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'

export default function ForgotPasswordPage() {
    const [state, dispatch, isPending] = useActionState(
        resetPassword,
        undefined
    )

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
                    <CardDescription>
                        Enter your email address and we&apos;ll send you a link to reset your password.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {state?.success ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-green-50 text-green-700 rounded-md text-sm">
                                {state.message}
                            </div>
                            <Button asChild className="w-full">
                                <Link href="/login">Return to Sign in</Link>
                            </Button>
                        </div>
                    ) : (
                        <form action={dispatch} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    placeholder="m@example.com"
                                    required
                                />
                            </div>
                            <div
                                className="flex h-8 items-end space-x-1"
                                aria-live="polite"
                                aria-atomic="true"
                            >
                                {state?.error && (
                                    <p className="text-sm text-red-500">{state.error}</p>
                                )}
                            </div>
                            <Button className="w-full" aria-disabled={isPending} type="submit">
                                {isPending ? 'Sending...' : 'Send Reset Link'}
                            </Button>
                            <div className="text-center text-sm">
                                <Link href="/login" className="text-blue-600 hover:underline">
                                    Back to Sign in
                                </Link>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
