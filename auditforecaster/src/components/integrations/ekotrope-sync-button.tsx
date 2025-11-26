'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { syncToEkotrope } from '@/app/actions/ekotrope'
import { toast } from 'sonner'
import { Loader2, UploadCloud, CheckCircle } from 'lucide-react'

interface EkotropeSyncButtonProps {
    inspectionId: string
    isSynced: boolean
    syncedAt?: Date | null
}

export function EkotropeSyncButton({ inspectionId, isSynced, syncedAt }: EkotropeSyncButtonProps) {
    const [loading, setLoading] = useState(false)

    const handleSync = async () => {
        setLoading(true)
        try {
            const result = await syncToEkotrope(inspectionId)
            if (result.success) {
                toast.success('Successfully synced to Ekotrope')
            } else {
                toast.error(result.error || 'Failed to sync to Ekotrope')
            }
        } catch {
            toast.error('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    if (isSynced) {
        return (
            <Button variant="outline" className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100" onClick={handleSync} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Synced {syncedAt ? new Date(syncedAt).toLocaleDateString() : ''}
            </Button>
        )
    }

    return (
        <Button variant="outline" onClick={handleSync} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UploadCloud className="h-4 w-4 mr-2" />}
            Sync to Ekotrope
        </Button>
    )
}
