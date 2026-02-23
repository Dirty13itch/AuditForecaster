'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        Sentry.captureException(error, { tags: { section: 'dashboard' } })
        console.error(error)
    }, [error])

    return (
        <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-2 text-center">
                <AlertCircle className="h-10 w-10 text-red-500" />
                <h2 className="text-2xl font-bold tracking-tight">Something went wrong!</h2>
                <p className="text-gray-500">
                    We encountered an error while loading this page.
                </p>
            </div>
            <Button
                onClick={
                    // Attempt to recover by trying to re-render the segment
                    () => reset()
                }
            >
                Try again
            </Button>
        </div>
    )
}
