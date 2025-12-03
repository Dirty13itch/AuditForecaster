import { describe, it, expect } from 'vitest'
import { getDevFeatures } from '../dev'

describe('Dev Actions', () => {
    it('getDevFeatures returns parsed features from real file', async () => {
        const result = await getDevFeatures()
        expect(result.success).toBe(true)
        expect(result.data?.features).toBeDefined()
        expect(Array.isArray(result.data?.features)).toBe(true)
        // Verify we have at least one feature (Phase 1)
        const phase1 = result.data?.features.find(f => f.id === 'phase-1')
        expect(phase1).toBeDefined()
        expect(phase1?.status).toBe('done')
    })
})
