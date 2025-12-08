import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Start seeding ...')

    // 1. Clean up existing data (optional, be careful in prod)
    // await prisma.photo.deleteMany()
    // await prisma.inspection.deleteMany()
    // await prisma.job.deleteMany()
    // await prisma.builder.deleteMany()
    // await prisma.user.deleteMany()

    // 2. Create Users
    const demoPasswordHash = '$2a$10$8K1p/a0dL1e.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1' // Mock hash

    const admin = await prisma.user.upsert({
        where: { email: 'admin@ulrich.com' },
        update: { passwordHash: demoPasswordHash },
        create: {
            email: 'admin@ulrich.com',
            name: 'Admin User',
            role: 'ADMIN',
            passwordHash: demoPasswordHash,
        },
    })

    const inspector1 = await prisma.user.upsert({
        where: { email: 'inspector1@ulrich.com' },
        update: { passwordHash: demoPasswordHash },
        create: {
            email: 'inspector1@ulrich.com',
            name: 'John Inspector',
            role: 'INSPECTOR',
            passwordHash: demoPasswordHash,
        },
    })

    const inspector2 = await prisma.user.upsert({
        where: { email: 'inspector2@ulrich.com' },
        update: { passwordHash: demoPasswordHash },
        create: {
            email: 'inspector2@ulrich.com',
            name: 'Jane Field',
            role: 'INSPECTOR',
            passwordHash: demoPasswordHash,
        },
    })

    const qaUser = await prisma.user.upsert({
        where: { email: 'qa@ulrich.com' },
        update: { passwordHash: demoPasswordHash },
        create: {
            email: 'qa@ulrich.com',
            name: 'Quincy QA',
            role: 'QA',
            passwordHash: demoPasswordHash,
        },
    })

    console.log('Created users:', { admin, inspector1, inspector2, qaUser })

    // 3. Create Builders & Subdivisions
    // Helper function to find or create builder
    async function findOrCreateBuilder(name: string, data: any) {
        let builder = await prisma.builder.findFirst({ where: { name } })
        if (!builder) {
            // Extract subdivisions from data
            const { subdivisions, ...builderData } = data;

            builder = await prisma.builder.create({
                data: {
                    ...builderData,
                    name,
                    subdivisions: subdivisions // Pass nested create
                },
                include: { subdivisions: true }
            })
        } else {
            // Ensure subdivisions exist for existing builder
            if (data.subdivisions?.create) {
                for (const sub of data.subdivisions.create) {
                    const existingSub = await prisma.subdivision.findFirst({
                        where: { name: sub.name, builderId: builder.id }
                    })
                    if (!existingSub) {
                        await prisma.subdivision.create({
                            data: { name: sub.name, builderId: builder.id }
                        })
                    }
                }
            }
        }

        // Refetch with subdivisions
        return prisma.builder.findUnique({
            where: { id: builder.id },
            include: { subdivisions: true }
        })
    }

    const builderA = await findOrCreateBuilder('Apex Homes', {
        email: 'contact@apexhomes.com',
        phone: '555-0101',
        address: '123 Apex Way, Austin, TX',
        subdivisions: {
            create: [
                { name: 'Apex Heights' },
                { name: 'Apex Valley' }
            ]
        }
    })

    const builderB = await findOrCreateBuilder('Bright Future Construction', {
        email: 'info@brightfuture.com',
        phone: '555-0102',
        address: '456 Bright Blvd, Dallas, TX',
        subdivisions: {
            create: [
                { name: 'Bright Meadows' }
            ]
        }
    })

    if (!builderA || !builderB) throw new Error('Failed to create builders')

    console.log('Created builders with subdivisions')

    // 4. Create Plans
    const plans = [
        { title: 'The Monarch', builderId: builderA.id, description: '2 Story, 2500 sqft' },
        { title: 'The Sovereign', builderId: builderA.id, description: '1 Story, 1800 sqft' },
        { title: 'Future Classic', builderId: builderB.id, description: 'Modern Farmhouse' }
    ]

    for (const plan of plans) {
        const existing = await prisma.plan.findFirst({ where: { title: plan.title, builderId: plan.builderId } })
        if (!existing) {
            await prisma.plan.create({ data: plan })
        }
    }
    console.log('Created plans')

    // 5. Create Equipment & Fleet
    const equipment = [
        { name: 'Retrotec 5000', serialNumber: 'SN-RT-5000-01', type: 'Blower Door', status: 'Active' },
        { name: 'Retrotec 5000', serialNumber: 'SN-RT-5000-02', type: 'Blower Door', status: 'Maintenance' },
        { name: 'Duct Blaster Pro', serialNumber: 'SN-DB-100-01', type: 'Duct Tester', status: 'Active' }
    ]

    for (const item of equipment) {
        const existing = await prisma.equipment.findFirst({ where: { serialNumber: item.serialNumber } })
        if (!existing) {
            await prisma.equipment.create({ data: item })
        }
    }

    const vehicles = [
        { name: 'Truck 01', licensePlate: 'TX-123-ABC', make: 'Ford', model: 'F-150', year: 2022, mileage: 15000, status: 'Active' },
        { name: 'Van 02', licensePlate: 'TX-456-XYZ', make: 'Ford', model: 'Transit', year: 2021, mileage: 32000, status: 'Active' }
    ]

    for (const v of vehicles) {
        const existing = await prisma.vehicle.findFirst({ where: { licensePlate: v.licensePlate } })
        if (!existing) {
            await prisma.vehicle.create({ data: v })
        }
    }
    console.log('Created equipment and fleet')

    // 6. Create Jobs
    const jobsData = [
        {
            lotNumber: 'Lot 101',
            streetAddress: '101 Oak St',
            city: 'Austin',
            address: '101 Oak St, Austin, TX',
            status: 'PENDING',
            builderId: builderA.id,
            subdivisionId: builderA.subdivisions[0]!.id
        },
        {
            lotNumber: 'Lot 102',
            streetAddress: '102 Oak St',
            city: 'Austin',
            address: '102 Oak St, Austin, TX',
            status: 'ASSIGNED',
            inspectorId: inspector1.id,
            builderId: builderA.id,
            subdivisionId: builderA.subdivisions[0]!.id,
            scheduledDate: new Date(new Date().setDate(new Date().getDate() + 1)), // Tomorrow
        },
        {
            lotNumber: 'Lot 205',
            streetAddress: '205 Pine Ln',
            city: 'Dallas',
            address: '205 Pine Ln, Dallas, TX',
            status: 'IN_PROGRESS',
            inspectorId: inspector2.id,
            builderId: builderB.id,
            subdivisionId: builderB.subdivisions[0]!.id,
            scheduledDate: new Date(), // Today
        },
        {
            lotNumber: 'Lot 206',
            streetAddress: '206 Pine Ln',
            city: 'Dallas',
            address: '206 Pine Ln, Dallas, TX',
            status: 'COMPLETED',
            inspectorId: inspector2.id,
            builderId: builderB.id,
            subdivisionId: builderB.subdivisions[0]!.id,
            scheduledDate: new Date(new Date().setDate(new Date().getDate() - 2)), // 2 days ago
        },
        {
            lotNumber: 'Lot 300',
            streetAddress: '300 Maple Ave',
            city: 'Austin',
            address: '300 Maple Ave, Austin, TX',
            status: 'REVIEWED',
            inspectorId: inspector1.id,
            builderId: builderA.id,
            subdivisionId: builderA.subdivisions[1]!.id,
            scheduledDate: new Date(new Date().setDate(new Date().getDate() - 5)),
        },
    ]

    for (const job of jobsData) {
        // Check if job exists by address (assuming address is unique enough for seed)
        const existing = await prisma.job.findFirst({ where: { address: job.address } })
        if (!existing) {
            await prisma.job.create({ data: job })
        }
    }

    console.log(`Seeded jobs.`)

    // 7. Create Report Template
    let template = await prisma.reportTemplate.findFirst({ where: { name: 'Standard Energy Audit' } })
    if (!template) {
        template = await prisma.reportTemplate.create({
            data: {
                name: 'Standard Energy Audit',
                description: 'Standard IECC 2021 Compliance',
                // Removed 'category' as it's not in schema
                structure: JSON.stringify({
                    pages: [
                        {
                            id: 'p1',
                            title: 'Envelope',
                            sections: [
                                {
                                    id: 's1',
                                    title: 'Air Barrier',
                                    items: [
                                        { id: 'q1', label: 'Windows and doors properly sealed', type: 'pass_fail', required: true },
                                        { id: 'q2', label: 'Attic hatch insulated and gasketed', type: 'pass_fail', required: true }
                                    ]
                                }
                            ]
                        },
                        {
                            id: 'p2',
                            title: 'Mechanicals',
                            sections: [
                                {
                                    id: 's2',
                                    title: 'HVAC',
                                    items: [
                                        { id: 'q3', label: 'HVAC ducts sealed', type: 'pass_fail', required: true },
                                        { id: 'q4', label: 'Filter accessible', type: 'pass_fail', required: true }
                                    ]
                                }
                            ]
                        }
                    ],
                    logic: []
                } as any) // Cast to any to avoid seed script type issues if types aren't perfectly synced
            }
        })
    }
    console.log('Created report template')

    // 8. Create Inspections for Completed Jobs
    const completedJob = await prisma.job.findFirst({ where: { status: 'COMPLETED' } })
    if (completedJob && template) {
        const existingInspection = await prisma.inspection.findFirst({ where: { jobId: completedJob.id } })
        if (!existingInspection) {
            await prisma.inspection.create({
                data: {
                    jobId: completedJob.id,
                    type: 'BLOWER_DOOR',
                    score: 95,
                    maxScore: 100,
                    data: JSON.stringify({ cfm50: 1200, ach50: 3.5 }),
                    reportTemplateId: template.id,
                    answers: JSON.stringify({ 'q1': { value: 'pass' }, 'q2': { value: 'pass' }, 'q3': { value: 'pass' } }),
                    photos: {
                        create: [
                            { url: 'https://placehold.co/600x400?text=Front+Elevation', caption: 'Front Elevation', category: 'Exterior' },
                            { url: 'https://placehold.co/600x400?text=Blower+Door', caption: 'Blower Door Setup', category: 'Testing' }
                        ]
                    }
                }
            })
            console.log('Created inspection for completed job')
        }
    }

    // 9. Create E2E Test Inspection & Job
    const e2eJobData = {
        id: 'e2e-job-1',
        lotNumber: 'Lot 205',
        streetAddress: '205 Pine Ln',
        city: 'Dallas',
        address: '205 Pine Ln, Dallas, TX',
        status: 'IN_PROGRESS',
        inspectorId: inspector2.id,
        builderId: builderB.id,
        subdivisionId: builderB.subdivisions[0]!.id,
        scheduledDate: new Date(), // Today
    } as const

    const e2eJob = await prisma.job.upsert({
        where: { id: 'e2e-job-1' },
        update: { ...e2eJobData },
        create: { ...e2eJobData }
    })

    if (e2eJob && template) {
        await prisma.inspection.upsert({
            where: { id: 'e2e-test-inspection' },
            update: {
                jobId: e2eJob.id,
                type: 'BLOWER_DOOR',
                status: 'IN_PROGRESS',
                reportTemplateId: template.id,
                data: '{}',
                checklist: '[]',
            },
            create: {
                id: 'e2e-test-inspection',
                jobId: e2eJob.id,
                type: 'BLOWER_DOOR',
                status: 'IN_PROGRESS',
                reportTemplateId: template.id,
                data: '{}',
                checklist: '[]',
            }
        })
        console.log('Upserted E2E test inspection')
    }

    // 10. Create Mileage Logs
    // We need to fetch the vehicle first to get its ID
    const vehicle = await prisma.vehicle.findFirst({ where: { licensePlate: 'TX-123-ABC' } })

    if (vehicle) {
        const mileageLogs = [
            {
                date: new Date(),
                distance: 12.5,
                startLocation: 'Office',
                endLocation: 'Site A',
                purpose: 'PENDING',
                status: 'PENDING',
                vehicleId: vehicle.id
            },
            {
                date: new Date(new Date().setDate(new Date().getDate() - 1)),
                distance: 5.2,
                startLocation: 'Site A',
                endLocation: 'Home',
                purpose: 'PENDING',
                status: 'PENDING',
                vehicleId: vehicle.id
            }
        ]

        for (const log of mileageLogs) {
            // Check if exists (fuzzy check by date, distance, and vehicle)
            const existing = await prisma.mileageLog.findFirst({
                where: {
                    date: log.date,
                    distance: log.distance,
                    vehicleId: log.vehicleId
                }
            })

            if (!existing) {
                await prisma.mileageLog.create({
                    data: log
                })
            }
        }
        console.log('Created pending mileage logs')
    }

    console.log('Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
