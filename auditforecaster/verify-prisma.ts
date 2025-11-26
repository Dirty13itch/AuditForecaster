import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Checking Prisma Client...')
    if ('integrationSettings' in prisma) {
        console.log('SUCCESS: integrationSettings exists on PrismaClient')
    } else {
        console.error('FAILURE: integrationSettings does NOT exist on PrismaClient')
        process.exit(1)
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
