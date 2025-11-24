/**
 * Integration tests for pricing server actions
 * Tests Zod validation and database operations
 */

import { prisma } from '@/lib/prisma'
import { createServiceItem, updateServiceItem, createPriceList, upsertPriceListItem } from '@/app/actions/pricing'

// Mock auth for testing
jest.mock('@/auth', () => ({
    auth: jest.fn(() => Promise.resolve({
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
        // Create test builder
        const builder = await prisma.builder.create({
            data: {
                name: 'Test Builder Co',
                email: 'test@builder.com'
            }
        })
        testBuilderId = builder.id
    })

    afterAll(async () => {
        // Cleanup
        await prisma.priceListItem.deleteMany({})
        await prisma.priceList.deleteMany({})
        await prisma.serviceItem.deleteMany({})
        await prisma.builder.delete({ where: { id: testBuilderId } })
        await prisma.$disconnect()
    })

    describe('createServiceItem', () => {
        it('should create a service item with valid data', async () => {
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
            const priceList = await prisma.priceList.create({
                data: {
                    name: 'Test Price List for Items'
                }
            })
            priceListId = priceList.id
        })

        it('should create a new price list item', async () => {
            const result = await upsertPriceListItem(priceListId, testServiceItemId, 200.00)

            expect(result.success).toBe(true)
            expect(result.data?.price).toBe(200.00)
        })

        it('should update existing price list item', async () => {
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
