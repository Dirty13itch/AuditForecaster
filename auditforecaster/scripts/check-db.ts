import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Connecting to database...')
        await prisma.$connect()
        console.log('✅ Connected to database')

        const userCount = await prisma.user.count()
        console.log(`✅ Found ${userCount} users`)

        await prisma.$disconnect()
    } catch (error) {
        console.error('❌ Database connection failed:', error)
        process.exit(1)
    }
}

main()
