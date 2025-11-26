import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getJobPrice } from '../pricing'
import { prisma } from '@/lib/prisma'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
    prisma: {
        priceList: {
            findFirst: vi.fn()
        },
        serviceItem: {
            findFirst: vi.fn()
        }
    }
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
    logger: {
        error: vi.fn()
    }
}))

describe('getJobPrice', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should return subdivision price if available', async () => {
        const mockPriceList = {
            items: [{
                price: 200,
                serviceItem: { name: 'Blower Door Test' }
            }]
        }
        vi.mocked(prisma.priceList.findFirst).mockResolvedValueOnce(mockPriceList as any)

        const price = await getJobPrice('builder-1', 'sub-1')

        expect(price).toBe(200)
        expect(prisma.priceList.findFirst).toHaveBeenCalledWith(expect.objectContaining({
            where: { subdivisionId: 'sub-1' }
        }))
    })

    it('should return builder price if subdivision price not found', async () => {
        // First call (subdivision) returns null
        vi.mocked(prisma.priceList.findFirst).mockResolvedValueOnce(null)

        // Second call (builder) returns price list
        const mockPriceList = {
            items: [{
                price: 250,
                serviceItem: { name: 'Blower Door Test' }
            }]
        }
        vi.mocked(prisma.priceList.findFirst).mockResolvedValueOnce(mockPriceList as any)

        const price = await getJobPrice('builder-1', 'sub-1')

        expect(price).toBe(250)
        expect(prisma.priceList.findFirst).toHaveBeenCalledTimes(2)
        expect(prisma.priceList.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({
            where: { builderId: 'builder-1' }
        }))
    })

    it('should return service item base price if no price lists found', async () => {
        vi.mocked(prisma.priceList.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.serviceItem.findFirst).mockResolvedValue({ basePrice: 300 } as any)

        const price = await getJobPrice('builder-1', 'sub-1')

        expect(price).toBe(300)
        expect(prisma.serviceItem.findFirst).toHaveBeenCalledWith({
            where: { name: 'Blower Door Test' }
        })
    })

    it('should return default price if nothing found', async () => {
        vi.mocked(prisma.priceList.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.serviceItem.findFirst).mockResolvedValue(null)

        const price = await getJobPrice('builder-1', 'sub-1')

        expect(price).toBe(350.00)
    })

    it('should handle errors gracefully and return default price', async () => {
        vi.mocked(prisma.priceList.findFirst).mockRejectedValue(new Error('DB Error'))

        const price = await getJobPrice('builder-1', 'sub-1')

        expect(price).toBe(350.00)
    })
})
