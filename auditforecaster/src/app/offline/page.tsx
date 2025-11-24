'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { WifiOff } from "lucide-react"

export default function OfflinePage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
            <div className="mb-6 rounded-full bg-gray-200 p-6">
                <WifiOff className="h-12 w-12 text-gray-500" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">You are offline</h1>
            <p className="mb-8 max-w-md text-gray-600">
                It seems you&apos;ve lost your internet connection. Please check your connection and try again.
            </p>
            <div className="flex gap-4">
                <Button onClick={() => window.location.reload()}>
                    Try Again
                </Button>
                <Link href="/dashboard">
                    <Button variant="outline">
                        Go to Dashboard
                    </Button>
                </Link>
            </div>
        </div>
    )
}
