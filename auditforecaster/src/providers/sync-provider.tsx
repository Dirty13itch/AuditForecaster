'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { syncEngine, SyncEngine } from '@/lib/sync-engine';

interface SyncContextType {
    isSyncing: boolean;
    engine: SyncEngine;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: React.ReactNode }) {
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        // Subscribe to engine updates
        const unsubscribe = syncEngine.subscribe((syncing) => {
            setIsSyncing(syncing);
        });

        // Initial check
        // syncEngine.triggerSync(); // Optional: trigger on mount

        return () => unsubscribe();
    }, []);

    return (
        <SyncContext.Provider value={{ isSyncing, engine: syncEngine }}>
            {children}
        </SyncContext.Provider>
    );
}

export function useSync() {
    const context = useContext(SyncContext);
    if (context === undefined) {
        throw new Error('useSync must be used within a SyncProvider');
    }
    return context;
}
