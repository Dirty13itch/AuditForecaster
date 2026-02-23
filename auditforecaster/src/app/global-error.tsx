'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        Sentry.captureException(error)
        console.error(error)
    }, [error])

    return (
        <html>
            <body>
                <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background text-foreground">
                    <AlertCircle className="h-12 w-12 text-destructive" />
                    <h2 className="text-2xl font-bold">Something went wrong!</h2>
                    <p className="text-muted-foreground max-w-md text-center">
                        A critical error occurred. Please try again or contact support if the issue persists.
                    </p>
                    {error.digest && (
                        <p className="text-xs text-muted-foreground">
                            Reference: {error.digest}
                        </p>
                    )}
                    <Button onClick={() => reset()}>Try again</Button>
                </div>
            </body>
        </html>
    )
}
