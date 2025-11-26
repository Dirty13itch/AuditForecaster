// Hook to manage offline synchronization and draft saving
import { useState, useEffect, useCallback } from 'react'
import { saveInspectionDraft, getInspectionDraft, ChecklistItem } from '@/lib/offline-storage'
import { useToast } from '@/components/ui/use-toast'

export function useOfflineSync<T>(jobId: string) {
    const { toast } = useToast()
    const [isOffline, setIsOffline] = useState(false)
    const [isSyncing] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const [offlineData, setOfflineData] = useState<T | null>(null)

    // ------------------------------------------------------------
    // Online / offline detection
    // ------------------------------------------------------------
    useEffect(() => {
        // Initial status
        setIsOffline(!navigator.onLine)

        const handleOnline = () => setIsOffline(false)
        const handleOffline = () => setIsOffline(true)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    // ------------------------------------------------------------
    // Notify when back online if unsynced changes exist
    // ------------------------------------------------------------
    useEffect(() => {
        if (!isOffline) {
            const checkUnsynced = async () => {
                const draft = await getInspectionDraft(jobId)
                if (draft && !draft.synced) {
                    toast({
                        title: 'You are back online',
                        description: 'You have unsynced changes. Please submit the form to save to the server.',
                        variant: 'default'
                    })
                }
            }
            checkUnsynced()
        }
    }, [isOffline, jobId, toast])

    // ------------------------------------------------------------
    // Load any previously saved draft when the hook mounts
    // ------------------------------------------------------------
    useEffect(() => {
        const loadDraft = async () => {
            const draft = await getInspectionDraft(jobId)
            if (draft) {
                setOfflineData(draft.data as T)
                if (draft.updatedAt) {
                    setLastSaved(new Date(draft.updatedAt))
                }
                if (!draft.synced) {
                    toast({
                        title: 'Offline Draft Found',
                        description: 'Loaded unsaved changes from your last session.',
                    })
                }
            }
        }
        loadDraft()
    }, [jobId, toast])

    // ------------------------------------------------------------
    // Save a draft to IndexedDB / local storage via the library helper
    // ------------------------------------------------------------
    const saveDraft = useCallback(
        async (data: T & { checklist?: ChecklistItem[] }) => {
            try {
                await saveInspectionDraft({
                    id: jobId,
                    jobId,
                    data,
                    checklist: (data.checklist as ChecklistItem[]) || [],
                })
                setLastSaved(new Date())
            } catch (error: unknown) {
                console.error('Failed to save draft:', error)
            }
        },
        [jobId]
    )

    return {
        isOffline,
        isSyncing,
        lastSaved,
        offlineData,
        saveDraft,
    }
}
