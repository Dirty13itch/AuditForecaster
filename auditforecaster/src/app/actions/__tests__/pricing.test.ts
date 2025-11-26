/**
 * Integration tests for pricing server actions
 * Tests Zod validation and database operations
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { createServiceItem, updateServiceItem, createPriceList, upsertPriceListItem } from '@/app/actions/pricing'

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}))

// Mock auth for testing
vi.mock('@/auth', () => ({
    auth: vi.fn(() => Promise.resolve({
        user: {
            id: 'test-admin-id',
            email: 'admin@example.com',
            name: 'Test Admin',
            role: 'ADMIN'
        }
    }))
}))

describe('Pricing Server Actions', () => {
    let testBuilderId: string
    let testServiceItemId: string

    beforeAll(async () => {
        // Mock builder creation
        const mockBuilder = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Test Builder Co',
            email: 'test@builder.com'
        }
            ; (prisma.builder.create as any).mockResolvedValue(mockBuilder)
        testBuilderId = mockBuilder.id
    })

    afterAll(async () => {
        vi.clearAllMocks()
    })

    describe('createServiceItem', () => {
        it('should create a service item with valid data', async () => {
            const mockServiceItem = {
                id: '123e4567-e89b-12d3-a456-426614174001',
                name: 'Blower Door Test',
                description: 'Standard blower door testing',
                basePrice: 150.00
            }
                ; (prisma.serviceItem.create as any).mockResolvedValue(mockServiceItem)

            const result = await createServiceItem({
                name: 'Blower Door Test',
                description: 'Standard blower door testing',
                basePrice: 150.00
            })

            expect(result.success).toBe(true)
            expect(result.data).toBeDefined()
            expect(result.data?.name).toBe('Blower Door Test')
            expect(result.data?.basePrice).toBe(150.00)

            testServiceItemId = result.data!.id
        })

        it('should reject service item with empty name', async () => {
            const result = await createServiceItem({
                name: '',
                basePrice: 100
            })

            expect(result.success).toBe(false)
            expect(result.error).toContain('Name is required')
        })

        it('should reject service item with negative price', async () => {
            const result = await createServiceItem({
                name: 'Test Service',
                basePrice: -50
            })

            expect(result.success).toBe(false)
            expect(result.error).toContain('Price must be positive')
        })
    })

    describe('updateServiceItem', () => {
        it('should update service item with valid data', async () => {
            const mockUpdatedItem = {
                id: '123e4567-e89b-12d3-a456-426614174001',
                name: 'Blower Door Test',
                basePrice: 175.00
            }
                ; (prisma.serviceItem.update as any).mockResolvedValue(mockUpdatedItem)

            const result = await updateServiceItem(testServiceItemId, {
                basePrice: 175.00
            })

            expect(result.success).toBe(true)
            expect(result.data?.basePrice).toBe(175.00)
        })

        it('should reject update with negative price', async () => {
            const result = await updateServiceItem(testServiceItemId, {
                basePrice: -100
            })

            expect(result.success).toBe(false)
            expect(result.error).toContain('Price must be positive')
        })
    })

    describe('createPriceList', () => {
        it('should create a price list with valid data', async () => {
            const mockPriceList = {
                id: '123e4567-e89b-12d3-a456-426614174002',
                name: 'Standard Pricing 2024',
                builderId: testBuilderId
            }
                ; (prisma.priceList.create as any).mockResolvedValue(mockPriceList)

            const result = await createPriceList({
                name: 'Standard Pricing 2024',
                builderId: testBuilderId
            })

            expect(result.success).toBe(true)
            expect(result.data).toBeDefined()
            expect(result.data?.name).toBe('Standard Pricing 2024')
            expect(result.data?.builderId).toBe(testBuilderId)
        })

        it('should reject price list with empty name', async () => {
            const result = await createPriceList({
                name: ''
            })

            expect(result.success).toBe(false)
            expect(result.error).toContain('Name is required')
        })
    })

    describe('upsertPriceListItem', () => {
        let priceListId: string

        beforeAll(async () => {
            const mockPriceList = {
                id: '123e4567-e89b-12d3-a456-426614174003',
                name: 'Test Price List for Items'
            }
                ; (prisma.priceList.create as any).mockResolvedValue(mockPriceList)

            priceListId = mockPriceList.id
        })

        it('should create a new price list item', async () => {
            const mockItem = {
                id: '123e4567-e89b-12d3-a456-426614174004',
                priceListId,
                serviceItemId: testServiceItemId,
                price: 200.00
            }
                ; (prisma.priceListItem.upsert as any).mockResolvedValue(mockItem)

            const result = await upsertPriceListItem(priceListId, testServiceItemId, 200.00)

            expect(result.success).toBe(true)
            expect(result.data?.price).toBe(200.00)
        })

        it('should update existing price list item', async () => {
            const mockItem = {
                id: '123e4567-e89b-12d3-a456-426614174004',
                priceListId,
                serviceItemId: testServiceItemId,
                price: 225.00
            }
                ; (prisma.priceListItem.upsert as any).mockResolvedValue(mockItem)

            const result = await upsertPriceListItem(priceListId, testServiceItemId, 225.00)

            expect(result.success).toBe(true)
            expect(result.data?.price).toBe(225.00)
        })

        it('should reject invalid UUID for priceListId', async () => {
            const result = await upsertPriceListItem('invalid-uuid', testServiceItemId, 100)

            expect(result.success).toBe(false)
            expect(result.error).toBeDefined()
        })

        it('should reject negative price', async () => {
            const result = await upsertPriceListItem(priceListId, testServiceItemId, -50)

            expect(result.success).toBe(false)
            expect(result.error).toBeDefined()
        })
    })
})
