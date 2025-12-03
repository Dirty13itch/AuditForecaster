import { prisma } from '../src/lib/prisma';

async function main() {
    const inspection = await prisma.inspection.findUnique({
        where: { id: 'e2e-test-inspection' },
        include: { job: true, reportTemplate: true }
    });

    if (inspection) {
        console.log('Inspection found:', JSON.stringify(inspection, null, 2));
    } else {
        console.log('Inspection NOT found');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
