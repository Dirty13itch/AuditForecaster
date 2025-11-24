import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getJobPrice } from '../pricing'
import { prismaMock } from '@/test/mocks/prisma'
import { logger } from '@/lib/logger'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: prismaMock
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        error: vi.fn()
    }
}))

describe('pricing utility', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('getJobPrice', () => {
        it('should return subdivision specific price if available', async () => {
            // Mock subdivision price list found
            prismaMock.priceList.findFirst.mockResolvedValueOnce({
                items: [
                    {
                        price: 450,
                        serviceItem: { name: 'Blower Door Test' }
                    }
                ]
            } as any)

            const price = await getJobPrice('builder-1', 'sub-1')

            expect(price).toBe(450)
            expect(prismaMock.priceList.findFirst).toHaveBeenCalledWith(expect.objectContaining({
                where: { subdivisionId: 'sub-1' }
            }))
        })

        it('should return builder specific price if no subdivision price', async () => {
            // Mock no subdivision price list
            prismaMock.priceList.findFirst.mockResolvedValueOnce(null)

            // Mock builder price list found
            prismaMock.priceList.findFirst.mockResolvedValueOnce({
                items: [
                    {
                        price: 400,
                        serviceItem: { name: 'Blower Door Test' }
                    }
                ]
            } as any)

            const price = await getJobPrice('builder-1', 'sub-1')

            expect(price).toBe(400)
            expect(prismaMock.priceList.findFirst).toHaveBeenCalledWith(expect.objectContaining({
                where: { builderId: 'builder-1' }
            }))
        })

        it('should return service item base price if no custom lists', async () => {
            // Mock no subdivision or builder lists
            prismaMock.priceList.findFirst.mockResolvedValue(null)

            // Mock service item found
            prismaMock.serviceItem.findFirst.mockResolvedValue({
                basePrice: 375
            } as any)

            const price = await getJobPrice('builder-1', 'sub-1')

            expect(price).toBe(375)
        })

        it('should return default price if nothing found', async () => {
            // Mock nothing found
            prismaMock.priceList.findFirst.mockResolvedValue(null)
            prismaMock.serviceItem.findFirst.mockResolvedValue(null)

            const price = await getJobPrice('builder-1', 'sub-1')

            expect(price).toBe(350) // Default fallback
        })

        it('should return default price and log error on failure', async () => {
            prismaMock.priceList.findFirst.mockRejectedValue(new Error('DB Error'))

            const price = await getJobPrice('builder-1', 'sub-1')

            expect(price).toBe(350)
            expect(logger.error).toHaveBeenCalled()
        })
    })
})
