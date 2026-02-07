'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        Sentry.captureException(error)
    }, [error])

    return (
        <div className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-2 text-center">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <h2 className="text-2xl font-bold">Something went wrong!</h2>
                <p className="text-muted-foreground max-w-[500px]">
                    {error.message || "An unexpected error occurred."}
                </p>
                {error.digest && (
                    <p className="text-xs text-muted-foreground font-mono">
                        Error ID: {error.digest}
                    </p>
                )}
            </div>
            <Button onClick={() => reset()}>Try again</Button>
        </div>
    )
}
