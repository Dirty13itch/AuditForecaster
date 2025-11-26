const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const jobId = 'cmif5b8lo0003cn30hk5h7p86'
    await prisma.inspection.deleteMany({
        where: { jobId: jobId }
    })
    console.log('Deleted inspections for job ' + jobId)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
