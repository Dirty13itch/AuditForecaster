
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const inspection = await prisma.inspection.findFirst({
        where: { status: 'PENDING' },
        select: { id: true }
    })

    if (inspection) {
        console.log(`FOUND_INSPECTION_ID: ${inspection.id}`)
    } else {
        console.log('NO_PENDING_INSPECTION_FOUND')
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
