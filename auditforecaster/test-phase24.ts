import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Create a test builder
    const builder = await prisma.builder.create({
        data: {
            name: 'Demo Builder Co',
            email: 'demo@builder.com',
            phone: '555-0100',
            address: '123 Main St'
        }
    })
    console.log('Created builder:', builder)

    // Create a subdivision for the builder
    const subdivision = await prisma.subdivision.create({
        data: {
            name: 'Sunset Hills',
            builderId: builder.id
        }
    })
    console.log('Created subdivision:', subdivision)

    // Create a service item
    const serviceItem = await prisma.serviceItem.create({
        data: {
            name: 'Blower Door Test',
            description: 'Complete blower door testing service',
            basePrice: 350.00
        }
    })
    console.log('Created service item:', serviceItem)

    // Create a price list
    const priceList = await prisma.priceList.create({
        data: {
            name: '2024 Standard Pricing',
            builderId: builder.id
        }
    })
    console.log('Created price list:', priceList)

    // Add item to price list
    const priceListItem = await prisma.priceListItem.create({
        data: {
            priceListId: priceList.id,
            serviceItemId: serviceItem.id,
            price: 325.00 // Discounted price for this builder
        }
    })
    console.log('Created price list item:', priceListItem)

    console.log('\n✅ Phase 24 test data created successfully!')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
