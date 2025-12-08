import { useState, useEffect, useRef } from 'react'
import { claimTaskAction, releaseTaskAction } from '@/app/actions/task-claiming'
import type { ClaimTaskResult } from '@/lib/task-claiming'

// Refresh interval for task claims (4 minutes, claim duration is 5 mins)
const CLAIM_REFRESH_INTERVAL = 4 * 60 * 1000

export function useTaskClaim(taskId: string) {
    const [isClaimed, setIsClaimed] = useState(false)
    const [claimedBy, setClaimedBy] = useState<string | null>(null)
    const [expiresAt, setExpiresAt] = useState<Date | null>(null)

    // Track if component is still mounted to prevent state updates after unmount
    const isMountedRef = useRef(true)
    // Track the current taskId to prevent race conditions
    const currentTaskIdRef = useRef(taskId)

    useEffect(() => {
        isMountedRef.current = true
        currentTaskIdRef.current = taskId

        const claim = async () => {
            // Don't update state if taskId has changed or component unmounted
            if (!isMountedRef.current || currentTaskIdRef.current !== taskId) {
                return
            }

            try {
                const result: ClaimTaskResult = await claimTaskAction(taskId)

                // Check again after async operation
                if (!isMountedRef.current || currentTaskIdRef.current !== taskId) {
                    return
                }

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
            } catch (error) {
                // Silently handle errors - don't crash the UI
                if (process.env.NODE_ENV === 'development') {
                    console.error('[useTaskClaim] Failed to claim task:', error)
                }
            }
        }

        claim()
        const interval = setInterval(claim, CLAIM_REFRESH_INTERVAL)

        return () => {
            isMountedRef.current = false
            clearInterval(interval)
            // Only release if we're cleaning up for the same taskId
            if (currentTaskIdRef.current === taskId) {
                releaseTaskAction(taskId).catch(() => {
                    // Ignore release errors during cleanup
                })
            }
        }
    }, [taskId])

    return { isClaimed, claimedBy, expiresAt }
}
