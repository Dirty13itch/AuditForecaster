'use client'

import { useActionState } from 'react'
import { authenticate } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'

import { useSearchParams } from 'next/navigation'

import { Suspense } from 'react'

function LoginForm() {
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

    const [errorMessage, dispatch, isPending] = useActionState(
        authenticate,
        undefined
    )

    return (
        <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
                <CardDescription>
                    Enter your email and password to access your account
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form action={(formData) => {
                    console.log('Form action triggered on client');
                    dispatch(formData);
                }} className="space-y-4">
                    <input type="hidden" name="callbackUrl" value={callbackUrl} />
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
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            name="password"
                            required
                        />
                    </div>
                    <div className="flex justify-end">
                        <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                            Forgot password?
                        </Link>
                    </div>
                    <div
                        className="flex h-8 items-end space-x-1"
                        aria-live="polite"
                        aria-atomic="true"
                    >
                        {errorMessage && (
                            <p className="text-sm text-red-500">{errorMessage}</p>
                        )}
                    </div>
                    <Button className="w-full" aria-disabled={isPending} type="submit">
                        {isPending ? 'Signing in...' : 'Sign in'}
                    </Button>
                </form>

                <div className="mt-6 text-sm text-gray-500">
                    <p className="font-medium mb-2">Demo Credentials:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Admin: admin@ulrich.com</li>
                        <li>Inspector: inspector1@ulrich.com</li>
                        <li>QA: qa@ulrich.com</li>
                        <li>Password: password123</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    )
}

export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <Suspense fallback={<div>Loading...</div>}>
                <LoginForm />
            </Suspense>
        </div>
    )
}
