
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // 1. Find the job we created in the UI audit
    const job = await prisma.job.findFirst({
        where: { lotNumber: 'Audit-Lot-Dialog' }
    })

    if (!job) {
        console.error('JOB_NOT_FOUND')
        return
    }

    // 2. Find any template
    let template = await prisma.reportTemplate.findFirst()
    if (!template) {
        // Fallback: Create a simple one if none exist
        template = await prisma.reportTemplate.create({
            data: {
                name: 'Fallback Template',
                structure: { pages: [] }
            }
        })
    }

    // 3. Create Inspection
    const inspection = await prisma.inspection.create({
        data: {
            jobId: job.id,
            templateId: template.id,
            status: 'PENDING',
            data: "{}",
            answers: {}
        }
    })

    console.log(`CREATED_INSPECTION_ID: ${inspection.id}`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
