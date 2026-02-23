import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Create a test job with a builder
    const builder = await prisma.builder.findFirst()

    if (!builder) {
        console.error('No builder found. Run test-phase24.ts first.')
        return
    }

    const job = await prisma.job.create({
        data: {
            lotNumber: 'LOT-ACH50-TEST',
            streetAddress: '456 Test Street',
            city: 'Minneapolis',
            address: '456 Test Street, Minneapolis, MN 55401',
            status: 'PENDING',
            builderId: builder.id
        }
    })

    console.log('Created test job:', job)
    console.log('\nTo test ACH50 calculation:')
    console.log('1. Navigate to http://localhost:3000/dashboard/jobs')
    console.log(`2. Click on job "${job.lotNumber}"`)
    console.log('3. Fill in the inspection form with:')
    console.log('   - CFM @ 50Pa: 1500')
    console.log('   - House Volume: 30000 cubic feet')
    console.log('   - Expected ACH50: (1500 × 60) / 30000 = 3.0')
    console.log('   - Expected Compliance: PASS (exactly at limit)')
    console.log('\n4. Submit the form and check the database for calculated values')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
