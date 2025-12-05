'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { autoClassifyLogs } from '@/app/actions/finance'

export function AutoClassifyButton() {
    const [loading, setLoading] = useState(false)

    const handleAutoClassify = async () => {
        setLoading(true)
        try {
            const result = await autoClassifyLogs()
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(`Auto-classified ${result.count} logs`)
            }
        } catch (error) {
            toast.error('Failed to auto-classify')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button variant="outline" onClick={handleAutoClassify} disabled={loading}>
            <Wand2 className="mr-2 h-4 w-4" />
            {loading ? 'Classifying...' : 'Auto Classify'}
        </Button>
    )
}
