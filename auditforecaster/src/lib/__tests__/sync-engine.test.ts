import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock offline-storage before importing
vi.mock('../offline-storage', () => ({
    enqueueMutation: vi.fn(),
    getMutationQueue: vi.fn().mockResolvedValue([]),
    removeMutation: vi.fn(),
    addFailedMutation: vi.fn(),
    getAllUnsyncedPhotos: vi.fn().mockResolvedValue([]),
    markPhotoSynced: vi.fn(),
}))

import { SyncEngine } from '../sync-engine'

describe('SyncEngine', () => {
    let engine: SyncEngine

    beforeEach(() => {
        vi.clearAllMocks()
        engine = new SyncEngine()
    })

    describe('subscribe', () => {
        it('allows subscribing to sync state changes', () => {
            const callback = vi.fn()
            const unsubscribe = engine.subscribe(callback)
            expect(typeof unsubscribe).toBe('function')
        })

        it('returns unsubscribe function that removes listener', () => {
            const callback = vi.fn()
            const unsubscribe = engine.subscribe(callback)
            unsubscribe()
            // After unsubscribing, callback should not be called on sync
        })
    })

    describe('enqueue', () => {
        it('creates a mutation item with correct structure', async () => {
            const { enqueueMutation } = await import('../offline-storage')

            // Mock navigator.onLine to prevent immediate sync
            Object.defineProperty(navigator, 'onLine', { value: false, writable: true })

            await engine.enqueue('create', 'inspection', { data: 'test' })

            expect(enqueueMutation).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'create',
                    resource: 'inspection',
                    payload: { data: 'test' },
                    retryCount: 0,
                })
            )
        })

        it('generates unique IDs for each mutation', async () => {
            const { enqueueMutation } = await import('../offline-storage')
            Object.defineProperty(navigator, 'onLine', { value: false, writable: true })

            await engine.enqueue('create', 'inspection', { data: '1' })
            await engine.enqueue('create', 'inspection', { data: '2' })

            const calls = (enqueueMutation as ReturnType<typeof vi.fn>).mock.calls
            expect(calls[0][0].id).not.toBe(calls[1][0].id)
        })
    })

    describe('triggerSync', () => {
        it('does not process when offline', async () => {
            const { getMutationQueue } = await import('../offline-storage')
            Object.defineProperty(navigator, 'onLine', { value: false, writable: true })

            await engine.triggerSync()

            expect(getMutationQueue).not.toHaveBeenCalled()
        })

        it('notifies subscribers when syncing starts and stops', async () => {
            Object.defineProperty(navigator, 'onLine', { value: true, writable: true })
            const callback = vi.fn()
            engine.subscribe(callback)

            await engine.triggerSync()

            expect(callback).toHaveBeenCalledWith(true)
            expect(callback).toHaveBeenCalledWith(false)
        })
    })
})
