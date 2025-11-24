import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * Get the price for a job based on builder's price list
 * Falls back to service item base price if no custom price list exists
 * 
 * @param builderId - The builder's ID
 * @param serviceItemName - Name of the service (e.g., "Blower Door Test")
 * @returns Price in dollars
 */
export async function getJobPrice(
    builderId: string,
    subdivisionId?: string | null,
    serviceItemName: string = "Blower Door Test"
): Promise<number> {
    // Default fallback price
    const DEFAULT_PRICE = 350.00

    try {
        // 1. If subdivision exists, try to find subdivision-specific price list
        if (subdivisionId) {
            const subdivisionPriceList = await prisma.priceList.findFirst({
                where: { subdivisionId },
                include: {
                    items: {
                        include: {
                            serviceItem: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            })

            if (subdivisionPriceList) {
                const priceListItem = subdivisionPriceList.items.find(
                    (item: { serviceItem: { name: string }; price: number }) =>
                        item.serviceItem.name === serviceItemName
                )

                if (priceListItem) {
                    return Number(priceListItem.price)
                }
            }
        }

        // 2. Try to find builder's active price list (fallback if no subdivision price)
        const builderPriceList = await prisma.priceList.findFirst({
            where: { builderId },
            include: {
                items: {
                    include: {
                        serviceItem: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        if (builderPriceList) {
            const priceListItem = builderPriceList.items.find(
                (item: { serviceItem: { name: string }; price: number }) =>
                    item.serviceItem.name === serviceItemName
            )

            if (priceListItem) {
                return Number(priceListItem.price)
            }
        }

        // 3. Fall back to service item base price
        const serviceItem = await prisma.serviceItem.findFirst({
            where: { name: serviceItemName }
        })

        if (serviceItem?.basePrice) {
            return Number(serviceItem.basePrice)
        }

        // 4. Ultimate fallback to default
        return DEFAULT_PRICE
    } catch (error) {
        logger.error('Error fetching job price', {
            builderId,
            subdivisionId,
            serviceItemName,
            error: error instanceof Error ? error.message : String(error)
        })
        return DEFAULT_PRICE
    }
}

/**
 * Get all available service items
 */
export async function getServiceItems() {
    return prisma.serviceItem.findMany({
        orderBy: { name: 'asc' }
    })
}
