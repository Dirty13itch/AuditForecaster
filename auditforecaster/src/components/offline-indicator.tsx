'use client'

import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(true)

    useEffect(() => {
        setIsOnline(navigator.onLine)

        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    if (isOnline) return null

    return (
        <div className="fixed top-0 left-0 right-0 bg-amber-600 text-white text-center py-2 px-4 z-50 flex items-center justify-center gap-2 text-sm font-medium shadow-lg">
            <WifiOff className="h-4 w-4" />
            <span>You are offline. Changes will sync when connection is restored.</span>
        </div>
    )
}
