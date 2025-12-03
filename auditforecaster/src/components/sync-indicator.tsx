'use client';

import { useSync } from '@/providers/sync-provider';
import { Loader2, Cloud, CloudOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function SyncIndicator() {
    const { isSyncing } = useSync();
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsOnline(navigator.onLine);

            const handleOnline = () => setIsOnline(true);
            const handleOffline = () => setIsOnline(false);

            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);

            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        }
    }, []);

    if (!isSyncing && isOnline) return null; // Hidden when all good

    return (
        <div className={cn(
            "fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-md border transition-all duration-300",
            isSyncing ? "bg-blue-500/10 text-blue-600 border-blue-200" :
                !isOnline ? "bg-red-500/10 text-red-600 border-red-200" :
                    "bg-background/80 border-border"
        )}>
            {isSyncing ? (
                <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Syncing...</span>
                </>
            ) : !isOnline ? (
                <>
                    <CloudOff className="h-3 w-3" />
                    <span>Offline</span>
                </>
            ) : (
                <>
                    <Cloud className="h-3 w-3" />
                    <span>Synced</span>
                </>
            )}
        </div>
    );
}
