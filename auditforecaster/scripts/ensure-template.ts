
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const count = await prisma.reportTemplate.count()
    if (count === 0) {
        await prisma.reportTemplate.create({
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
        console.log('TEMPLATE_CREATED')
    } else {
        console.log('TEMPLATE_EXISTS')
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
