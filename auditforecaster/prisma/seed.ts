import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Start seeding ...')

    // Password: password123
    const demoPasswordHash = '$2b$12$bGE5158j3fx2JpEmQ41UBuIWDsxexOguKxCnt14E9Q1TNPDc9iwta'

    // === USERS ===
    const shaun = await prisma.user.upsert({
        where: { email: 'shaun@ulrich.com' },
        update: { passwordHash: demoPasswordHash, name: 'Shaun', role: 'ADMIN' },
        create: {
            email: 'shaun@ulrich.com',
            name: 'Shaun',
            role: 'ADMIN',
            passwordHash: demoPasswordHash,
        },
    })

    const erik = await prisma.user.upsert({
        where: { email: 'erik@ulrich.com' },
        update: { passwordHash: demoPasswordHash, name: 'Erik', role: 'INSPECTOR' },
        create: {
            email: 'erik@ulrich.com',
            name: 'Erik',
            role: 'INSPECTOR',
            passwordHash: demoPasswordHash,
        },
    })

    const pat = await prisma.user.upsert({
        where: { email: 'pat@buildingknowledge.com' },
        update: { passwordHash: demoPasswordHash, name: 'Pat (Building Knowledge)', role: 'INSPECTOR' },
        create: {
            email: 'pat@buildingknowledge.com',
            name: 'Pat (Building Knowledge)',
            role: 'INSPECTOR',
            passwordHash: demoPasswordHash,
        },
    })

    // Keep old admin for backwards compat
    await prisma.user.upsert({
        where: { email: 'admin@ulrich.com' },
        update: { passwordHash: demoPasswordHash },
        create: {
            email: 'admin@ulrich.com',
            name: 'Shaun (Admin)',
            role: 'ADMIN',
            passwordHash: demoPasswordHash,
        },
    })

    console.log('Created users:', { shaun: shaun.name, erik: erik.name, pat: pat.name })

    // === BUILDER (Building Knowledge is the main contractor) ===
    let buildingKnowledge = await prisma.builder.findFirst({ where: { name: 'Building Knowledge' } })
    if (!buildingKnowledge) {
        buildingKnowledge = await prisma.builder.create({
            data: {
                name: 'Building Knowledge',
                email: 'pat@buildingknowledge.com',
                phone: '555-0100',
                address: 'Raleigh, NC',
                subdivisions: {
                    create: [
                        { name: 'Wendell Falls' },
                        { name: 'Briar Chapel' },
                        { name: '5401 North' },
                    ]
                }
            },
            include: { subdivisions: true }
        })
    }
    const bk = await prisma.builder.findUnique({
        where: { id: buildingKnowledge.id },
        include: { subdivisions: true }
    })
    if (!bk) throw new Error('Failed to create Building Knowledge')

    console.log('Created Building Knowledge with subdivisions')

    // === EQUIPMENT ===
    const equipmentItems = [
        { name: 'Retrotec 5000 #1', serialNumber: 'SN-RT-5001', type: 'Blower Door', status: 'ACTIVE', assignedTo: shaun.id },
        { name: 'Retrotec 5000 #2', serialNumber: 'SN-RT-5002', type: 'Blower Door', status: 'ACTIVE', assignedTo: erik.id },
        { name: 'Duct Blaster Pro', serialNumber: 'SN-DB-001', type: 'Duct Tester', status: 'ACTIVE', assignedTo: shaun.id },
        { name: 'FLIR E8 IR Camera', serialNumber: 'SN-FLIR-E8-01', type: 'IR Camera', status: 'ACTIVE', assignedTo: erik.id },
        { name: 'TEC TruFlow Grid', serialNumber: 'SN-TFG-001', type: 'Flow Grid', status: 'ACTIVE' },
        { name: 'Manometer (spare)', serialNumber: 'SN-MAN-002', type: 'Manometer', status: 'CALIBRATION_DUE' },
    ]

    for (const item of equipmentItems) {
        const existing = await prisma.equipment.findFirst({ where: { serialNumber: item.serialNumber } })
        if (!existing) {
            await prisma.equipment.create({ data: item })
        }
    }
    console.log('Created equipment')

    // === JOBS FOR THIS WEEK ===
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7)) // Get this Monday
    monday.setHours(8, 0, 0, 0)

    const makeDate = (dayOffset: number, hour: number = 9) => {
        const d = new Date(monday)
        d.setDate(monday.getDate() + dayOffset)
        d.setHours(hour, 0, 0, 0)
        return d
    }

    const jobsData = [
        // Monday - 3 jobs
        {
            lotNumber: '142', streetAddress: '1420 Wendell Falls Pkwy', city: 'Wendell', address: '1420 Wendell Falls Pkwy, Wendell, NC',
            status: 'ASSIGNED', inspectorId: shaun.id, builderId: bk.id, subdivisionId: bk.subdivisions[0]?.id,
            scheduledDate: makeDate(0, 9), googleEventId: 'bk-cal-001',
        },
        {
            lotNumber: '143', streetAddress: '1430 Wendell Falls Pkwy', city: 'Wendell', address: '1430 Wendell Falls Pkwy, Wendell, NC',
            status: 'ASSIGNED', inspectorId: erik.id, builderId: bk.id, subdivisionId: bk.subdivisions[0]?.id,
            scheduledDate: makeDate(0, 10), googleEventId: 'bk-cal-002',
        },
        {
            lotNumber: '88', streetAddress: '220 Briar Chapel Pkwy', city: 'Chapel Hill', address: '220 Briar Chapel Pkwy, Chapel Hill, NC',
            status: 'PENDING', builderId: bk.id, subdivisionId: bk.subdivisions[1]?.id,
            scheduledDate: makeDate(0, 14), googleEventId: 'bk-cal-003',
        },
        // Tuesday - 2 jobs
        {
            lotNumber: '310', streetAddress: '310 5401 North Blvd', city: 'Raleigh', address: '310 5401 North Blvd, Raleigh, NC',
            status: 'ASSIGNED', inspectorId: shaun.id, builderId: bk.id, subdivisionId: bk.subdivisions[2]?.id,
            scheduledDate: makeDate(1, 9), googleEventId: 'bk-cal-004',
        },
        {
            lotNumber: '311', streetAddress: '312 5401 North Blvd', city: 'Raleigh', address: '312 5401 North Blvd, Raleigh, NC',
            status: 'ASSIGNED', inspectorId: erik.id, builderId: bk.id, subdivisionId: bk.subdivisions[2]?.id,
            scheduledDate: makeDate(1, 10), googleEventId: 'bk-cal-005',
        },
        // Wednesday - 3 jobs
        {
            lotNumber: '144', streetAddress: '1440 Wendell Falls Pkwy', city: 'Wendell', address: '1440 Wendell Falls Pkwy, Wendell, NC',
            status: 'PENDING', builderId: bk.id, subdivisionId: bk.subdivisions[0]?.id,
            scheduledDate: makeDate(2, 9), googleEventId: 'bk-cal-006',
        },
        {
            lotNumber: '89', streetAddress: '222 Briar Chapel Pkwy', city: 'Chapel Hill', address: '222 Briar Chapel Pkwy, Chapel Hill, NC',
            status: 'ASSIGNED', inspectorId: shaun.id, builderId: bk.id, subdivisionId: bk.subdivisions[1]?.id,
            scheduledDate: makeDate(2, 11), googleEventId: 'bk-cal-007',
        },
        {
            lotNumber: '90', streetAddress: '224 Briar Chapel Pkwy', city: 'Chapel Hill', address: '224 Briar Chapel Pkwy, Chapel Hill, NC',
            status: 'ASSIGNED', inspectorId: erik.id, builderId: bk.id, subdivisionId: bk.subdivisions[1]?.id,
            scheduledDate: makeDate(2, 13), googleEventId: 'bk-cal-008',
        },
        // Thursday - 2 jobs
        {
            lotNumber: '312', streetAddress: '314 5401 North Blvd', city: 'Raleigh', address: '314 5401 North Blvd, Raleigh, NC',
            status: 'PENDING', builderId: bk.id, subdivisionId: bk.subdivisions[2]?.id,
            scheduledDate: makeDate(3, 9), googleEventId: 'bk-cal-009',
        },
        {
            lotNumber: '145', streetAddress: '1450 Wendell Falls Pkwy', city: 'Wendell', address: '1450 Wendell Falls Pkwy, Wendell, NC',
            status: 'PENDING', builderId: bk.id, subdivisionId: bk.subdivisions[0]?.id,
            scheduledDate: makeDate(3, 13), googleEventId: 'bk-cal-010',
        },
        // Friday - 1 job
        {
            lotNumber: '91', streetAddress: '226 Briar Chapel Pkwy', city: 'Chapel Hill', address: '226 Briar Chapel Pkwy, Chapel Hill, NC',
            status: 'ASSIGNED', inspectorId: shaun.id, builderId: bk.id, subdivisionId: bk.subdivisions[1]?.id,
            scheduledDate: makeDate(4, 9), googleEventId: 'bk-cal-011',
        },
    ]

    for (const job of jobsData) {
        const existing = await prisma.job.findFirst({ where: { address: job.address } })
        if (!existing) {
            await prisma.job.create({ data: job })
        }
    }
    console.log(`Seeded ${jobsData.length} jobs for the week`)

    // === REPORT TEMPLATES ===
    let preDrywallTemplate = await prisma.reportTemplate.findFirst({ where: { name: 'Pre-Drywall Inspection' } })
    if (!preDrywallTemplate) {
        preDrywallTemplate = await prisma.reportTemplate.create({
            data: {
                name: 'Pre-Drywall Inspection',
                description: 'Pre-drywall site visit checklist',
                isDefault: true,
                structure: JSON.stringify({
                    pages: [{
                        id: 'p1', title: 'Envelope',
                        sections: [{
                            id: 's1', title: 'Air Barrier',
                            items: [
                                { id: 'q1', label: 'Windows and doors properly sealed', type: 'pass_fail', required: true },
                                { id: 'q2', label: 'Attic hatch insulated and gasketed', type: 'pass_fail', required: true },
                                { id: 'q3', label: 'All penetrations sealed', type: 'pass_fail', required: true },
                            ]
                        }]
                    }]
                })
            }
        })
    }

    let finalTestTemplate = await prisma.reportTemplate.findFirst({ where: { name: 'Final Testing' } })
    if (!finalTestTemplate) {
        finalTestTemplate = await prisma.reportTemplate.create({
            data: {
                name: 'Final Testing',
                description: 'Final blower door and duct blaster testing',
                structure: JSON.stringify({
                    pages: [{
                        id: 'p1', title: 'Blower Door Test',
                        sections: [{
                            id: 's1', title: 'Results',
                            items: [
                                { id: 'q1', label: 'CFM50', type: 'number', required: true },
                                { id: 'q2', label: 'ACH50', type: 'number', required: true },
                                { id: 'q3', label: 'Pass/Fail', type: 'pass_fail', required: true },
                            ]
                        }]
                    }]
                })
            }
        })
    }
    console.log('Created report templates')

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
