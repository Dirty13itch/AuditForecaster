import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useOfflineSync } from '../use-offline-sync'
import { getInspectionDraft, saveInspectionDraft } from '@/lib/offline-storage'

// Mock dependencies
vi.mock('@/lib/offline-storage', () => ({
    getInspectionDraft: vi.fn(),
    saveInspectionDraft: vi.fn()
}))

vi.mock('@/components/ui/use-toast', () => ({
    useToast: () => ({ toast: vi.fn() })
}))

describe('useOfflineSync', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Default to online
        Object.defineProperty(navigator, 'onLine', {
            configurable: true,
            value: true
        })
    })

    it('should initialize with correct online status', () => {
        const { result } = renderHook(() => useOfflineSync('job-1'))
        expect(result.current.isOffline).toBe(false)
    })

    it('should initialize as offline if navigator says so', () => {
        Object.defineProperty(navigator, 'onLine', {
            configurable: true,
            value: false
        })
        const { result } = renderHook(() => useOfflineSync('job-1'))
        expect(result.current.isOffline).toBe(true)
    })

    it('should update status on window events', () => {
        const { result } = renderHook(() => useOfflineSync('job-1'))

        act(() => {
            window.dispatchEvent(new Event('offline'))
        })
        expect(result.current.isOffline).toBe(true)

        act(() => {
            window.dispatchEvent(new Event('online'))
        })
        expect(result.current.isOffline).toBe(false)
    })

    it('should load draft on mount', async () => {
        const mockDraft = {
            data: { foo: 'bar' },
            updatedAt: new Date().toISOString(),
            synced: false
        }
        vi.mocked(getInspectionDraft).mockResolvedValue(mockDraft as any)

        const { result } = renderHook(() => useOfflineSync('job-1'))

        await waitFor(() => {
            expect(result.current.offlineData).toEqual({ foo: 'bar' })
        })
        expect(getInspectionDraft).toHaveBeenCalledWith('job-1')
    })

    it('should save draft', async () => {
        vi.mocked(saveInspectionDraft).mockResolvedValue(undefined)
        vi.mocked(getInspectionDraft).mockResolvedValue(null)

        const { result } = renderHook(() => useOfflineSync('job-1'))
        const data = { foo: 'baz' }

        await act(async () => {
            await result.current.saveDraft(data)
        })

        expect(saveInspectionDraft).toHaveBeenCalledWith(expect.objectContaining({
            jobId: 'job-1',
            data
        }))
        expect(result.current.lastSaved).toBeInstanceOf(Date)
    })
})
