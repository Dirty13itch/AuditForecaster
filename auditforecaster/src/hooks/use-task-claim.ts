import { useState, useEffect } from 'react'
import { claimTaskAction, releaseTaskAction } from '@/app/actions/task-claiming'
import type { ClaimTaskResult } from '@/lib/task-claiming'

export function useTaskClaim(taskId: string) {
    const [isClaimed, setIsClaimed] = useState(false)
    const [claimedBy, setClaimedBy] = useState<string | null>(null)
    const [expiresAt, setExpiresAt] = useState<Date | null>(null)

    useEffect(() => {
        const claim = async () => {
            const result: ClaimTaskResult = await claimTaskAction(taskId)
            if (result.success) {
                if (result.claimed) {
                    setIsClaimed(true)
                    setExpiresAt(result.expiresAt ? new Date(result.expiresAt) : null)
                } else {
                    // Feature disabled
                    setIsClaimed(true)
                }
            } else {
                setIsClaimed(false)
                // Safely access claimedBy if it exists
                const user = 'claimedBy' in result ? result.claimedBy : null
                setClaimedBy(user || 'Unknown')
            }
        }

        claim()
        // Refresh claim every 4 minutes (if duration is 5 mins)
        const interval = setInterval(claim, 4 * 60 * 1000)

        return () => {
            clearInterval(interval)
            releaseTaskAction(taskId)
        }
    }, [taskId])

    return { isClaimed, claimedBy, expiresAt }
}
