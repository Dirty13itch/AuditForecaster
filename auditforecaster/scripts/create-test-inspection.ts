
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // 1. Find a builder (or create one)
    let builder = await prisma.builder.findFirst()
    if (!builder) {
        builder = await prisma.builder.create({
            data: {
                name: 'Test Builder',
                email: 'builder@test.com',
                phone: '555-0100'
            }
        })
    }

    // 2. Find a template (or create one)
    let template = await prisma.reportTemplate.findFirst()
    if (!template) {
        template = await prisma.reportTemplate.create({
            data: {
                name: 'Standard Inspection',
                description: 'Standard inspection template',
                category: 'General',
                structure: {
                    pages: [
                        {
                            id: 'p1',
                            title: 'General',
                            sections: [
                                {
                                    id: 's1',
                                    title: 'Basics',
                                    items: [
                                        { id: 'q1', type: 'yes_no', label: 'Is the site accessible?', required: true },
                                        { id: 'q2', type: 'text', label: 'Notes', required: false }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            }
        })
    }

    // 3. Create Job
    const job = await prisma.job.create({
        data: {
            lotNumber: 'AUDIT-AUTO-1',
            streetAddress: '123 Auto Way',
            city: 'Austin',
            state: 'TX',
            zipCode: '78701',
            builderId: builder.id,
            status: 'IN_PROGRESS'
        }
    })

    // 4. Create Inspection
    const inspection = await prisma.inspection.create({
        data: {
            jobId: job.id,
            templateId: template.id,
            status: 'PENDING',
            data: "{}", // Legacy field, must be string
            answers: {} // New field, JSON
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
