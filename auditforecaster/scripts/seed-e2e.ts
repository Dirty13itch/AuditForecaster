import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    try {
        const passwordHash = await bcrypt.hash('password123', 10);

        // 1. Create/Update Test User (Inspector)
        const inspector = await prisma.user.upsert({
            where: { email: 'inspector@example.com' },
            update: { passwordHash },
            create: {
                email: 'inspector@example.com',
                name: 'Test Inspector',
                role: 'INSPECTOR',
                passwordHash,
            },
        });

        // 2. Create/Update Test Builder
        const builder = await prisma.builder.upsert({
            where: { id: 'e2e-test-builder' },
            update: {},
            create: {
                id: 'e2e-test-builder',
                name: 'Test Builder',
                email: 'builder@example.com',
                phone: '555-0100',
                address: '123 Builder Ln',
            },
        });

        // 3. Create Test Job
        const job = await prisma.job.upsert({
            where: { id: 'e2e-test-job' },
            update: {},
            create: {
                id: 'e2e-test-job',
                address: '123 Test St',
                lotNumber: '101',
                streetAddress: '123 Test St',
                city: 'Test City',
                status: 'ASSIGNED',
                builderId: builder.id,
                inspectorId: inspector.id,
                scheduledDate: new Date(),
            },
        });

        // 4. Create Report Template
        const template = await prisma.reportTemplate.upsert({
            where: { id: 'e2e-test-template' },
            update: {},
            create: {
                id: 'e2e-test-template',
                name: 'E2E Inspection Template',
                description: 'Template for E2E tests',
                structure: {
                    pages: [
                        {
                            title: 'Page 1',
                            sections: [
                                {
                                    title: 'Section 1',
                                    items: [
                                        {
                                            id: 'item-1',
                                            type: 'text',
                                            label: 'Test Question',
                                            required: true
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            }
        });

        // 5. Create Test Inspection
        const inspection = await prisma.inspection.upsert({
            where: { id: 'e2e-test-inspection' },
            update: {
                reportTemplateId: template.id
            },
            create: {
                id: 'e2e-test-inspection',
                jobId: job.id,
                status: 'SCHEDULED',
                type: 'PRE_DRYWALL',
                data: '{}',
                checklist: '[]',
                reportTemplateId: template.id
            },
        });

        // 6. Create Test Invoice
        await prisma.invoice.upsert({
            where: { id: 'e2e-test-invoice' },
            update: {},
            create: {
                id: 'e2e-test-invoice',
                number: 'INV-E2E-001',
                date: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'DRAFT',
                totalAmount: 150.00,
                builderId: builder.id,
                items: {
                    create: {
                        description: 'E2E Test Item',
                        quantity: 1,
                        unitPrice: 150.00,
                        totalPrice: 150.00
                    }
                }
            }
        });

        // 7. Create Test Payout
        await prisma.payout.upsert({
            where: { id: 'e2e-test-payout' },
            update: {},
            create: {
                id: 'e2e-test-payout',
                userId: inspector.id,
                periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                periodEnd: new Date(),
                amount: 500.00,
                status: 'DRAFT'
            }
        });

        // 8. Create Test Vehicle
        await prisma.vehicle.upsert({
            where: { id: 'e2e-test-vehicle' },
            update: {},
            create: {
                id: 'e2e-test-vehicle',
                name: 'E2E Truck',
                licensePlate: 'E2E-TRUCK',
                make: 'Ford',
                model: 'F-150',
                year: 2023,
                mileage: 10000,
                status: 'ACTIVE'
            }
        });

        // 9. Create Test Equipment
        await prisma.equipment.upsert({
            where: { id: 'e2e-test-equipment' },
            update: {},
            create: {
                id: 'e2e-test-equipment',
                name: 'E2E Blower Door',
                type: 'Blower Door',
                serialNumber: 'SN-E2E-001',
                status: 'ACTIVE'
            }
        });

        // 10. Create Test Admin User
        await prisma.user.upsert({
            where: { email: 'admin@example.com' },
            update: { passwordHash },
            create: {
                email: 'admin@example.com',
                name: 'Test Admin',
                role: 'ADMIN',
                passwordHash,
            },
        });

        // 11. Create Test Builder with Plan
        const builderWithPlan = await prisma.builder.upsert({
            where: { id: 'e2e-test-builder-plan' },
            update: {},
            create: {
                id: 'e2e-test-builder-plan',
                name: 'Builder With Plan',
                email: 'builder.plan@example.com',
                plans: {
                    create: {
                        title: 'Test Plan A',
                        description: 'A test floor plan'
                    }
                }
            }
        });

        // 12. Create Completed Inspection for Analytics
        await prisma.inspection.upsert({
            where: { id: 'e2e-completed-inspection' },
            update: {},
            create: {
                id: 'e2e-completed-inspection',
                jobId: job.id,
                status: 'COMPLETED',
                type: 'FINAL',
                score: 95,
                maxScore: 100,
                data: '{}',
                checklist: '[]',
                createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
            }
        });

        console.log('Seeded E2E data:', { inspectionId: inspection.id });
    } catch (e) {
        console.error('Seeding failed:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
