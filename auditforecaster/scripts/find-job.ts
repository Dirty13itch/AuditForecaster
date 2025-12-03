
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const job = await prisma.job.findFirst({
        where: { lotNumber: 'Audit-Lot-Dialog' },
        select: { id: true }
    })

    if (job) {
        console.log(`FOUND_JOB_ID: ${job.id}`)
    } else {
        console.log('JOB_NOT_FOUND')
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
