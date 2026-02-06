'use server'

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit"
import { assertValidId } from "@/lib/utils"

export async function createInvoice(data: {
    builderId: string
    jobIds: string[]
    dueDate: Date
    notes?: string
}) {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        throw new Error("Unauthorized")
    }

    const { builderId, jobIds, dueDate, notes } = data

    // 1. Fetch jobs to calculate totals
    const jobs = await prisma.job.findMany({
        where: {
            id: { in: jobIds },
            builderId: builderId, // Security check
            status: { in: ['COMPLETED', 'REVIEWED'] } // Only completed jobs
        },
        include: {
            subdivision: {
                include: {
                    priceLists: {
                        include: {
                            items: {
                                include: {
                                    serviceItem: true
                                }
                            }
                        }
                    }
                }
            },
            builder: {
                include: {
                    priceLists: {
                        include: {
                            items: {
                                include: {
                                    serviceItem: true
                                }
                            }
                        }
                    }
                }
            }
        }
    })

    if (jobs.length === 0) {
        throw new Error("No valid jobs found for invoice")
    }

    // 2. Calculate Line Items
    const invoiceItems: Prisma.InvoiceItemCreateWithoutInvoiceInput[] = []
    let totalAmount = 0

    for (const job of jobs) {
        // Determine Price List (Subdivision specific > Builder default)
        const priceList = job.subdivision?.priceLists[0] || job.builder?.priceLists[0]

        if (!priceList) {
            // Fallback if no price list found - create a generic item
            // In a real app, this should probably error or warn
            invoiceItems.push({
                description: `Inspection for ${job.address}`,
                quantity: 1,
                unitPrice: 0,
                totalPrice: 0,
                job: { connect: { id: job.id } }
            })
            continue
        }

        // Add items from price list
        // Logic: For now, we assume 1 "Standard Inspection" per job. 
        // In future, we might check Inspection Type to match Service Item.
        for (const item of priceList.items) {
            const price = item.price
            invoiceItems.push({
                description: `${item.serviceItem.name} - ${job.address}`,
                quantity: 1,
                unitPrice: price,
                totalPrice: price,
                job: { connect: { id: job.id } }
            })
            totalAmount += price
        }
    }

    // 3. Generate Invoice Number
    const count = await prisma.invoice.count()
    const year = new Date().getFullYear()
    const number = `INV-${year}-${(count + 1).toString().padStart(4, '0')}`

    // 4. Create Invoice Transaction
    const invoice = await prisma.$transaction(async (tx) => {
        // Create Invoice
        const newInvoice = await tx.invoice.create({
            data: {
                number,
                dueDate,
                notes,
                totalAmount,
                status: 'DRAFT',
                builderId,
                items: {
                    create: invoiceItems
                }
            }
        })

        // Update Jobs to INVOICED status (Wait, we don't have INVOICED in enum yet? 
        // We changed status to String, so we can just use "INVOICED")
        await tx.job.updateMany({
            where: { id: { in: jobIds } },
            data: { status: 'INVOICED' }
        })

        await logAudit({
            entityType: 'INVOICE',
            entityId: newInvoice.id,
            action: 'CREATE',
            changes: { number, totalAmount, builderId, jobCount: jobs.length },
            tx // Pass transaction
        })

        return newInvoice
    })

    revalidatePath('/dashboard/finances/invoices')
    return { success: true, invoiceId: invoice.id }
}

export async function updateInvoiceStatus(id: string, status: string) {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        throw new Error("Unauthorized")
    }

    assertValidId(id, 'Invoice ID')

    const validStatuses = ['DRAFT', 'SENT', 'PAID', 'VOID', 'OVERDUE']
    if (!validStatuses.includes(status)) {
        throw new Error("Invalid invoice status")
    }

    const data: Prisma.InvoiceUpdateInput = { status }
    if (status === 'SENT') data.sentAt = new Date()
    if (status === 'PAID') data.paidAt = new Date()

    await prisma.invoice.update({
        where: { id },
        data
    })

    await logAudit({
        entityType: 'INVOICE',
        entityId: id,
        action: 'UPDATE',
        changes: { field: 'status', to: status }
    })

    revalidatePath(`/dashboard/finances/invoices/${id}`)
    revalidatePath('/dashboard/finances/invoices')
}

export async function deleteInvoice(id: string) {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        throw new Error("Unauthorized")
    }

    assertValidId(id, 'Invoice ID')

    const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: { items: true }
    })

    if (!invoice) throw new Error("Invoice not found")
    if (invoice.status !== 'DRAFT') throw new Error("Cannot delete non-draft invoice")

    // Reset job statuses
    const jobIds = invoice.items.map(i => i.jobId).filter(id => id !== null) as string[]

    await prisma.$transaction(async (tx) => {
        await tx.job.updateMany({
            where: { id: { in: jobIds } },
            data: { status: 'COMPLETED' }
        })

        // Soft Delete
        await tx.invoice.update({
            where: { id },
            data: { deletedAt: new Date(), status: 'VOID' }
        })

        await logAudit({
            entityType: 'INVOICE',
            entityId: id,
            action: 'DELETE', // Log as DELETE for clarity, or SOFT_DELETE
            changes: { reason: 'User deleted draft invoice (Soft Delete)' },
            tx
        })
    })

    revalidatePath('/dashboard/finances/invoices')
}

export async function getUninvoicedJobs(builderId: string) {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        throw new Error("Unauthorized")
    }

    const jobs = await prisma.job.findMany({
        where: {
            builderId,
            status: { in: ['COMPLETED', 'REVIEWED'] },
            // Ensure not already linked to an invoice item (double check)
            // Actually, we rely on status not being 'INVOICED'
            // But let's be safe:
            invoiceItems: {
                none: {
                    invoice: {
                        deletedAt: null
                    }
                }
            }
        },
        take: 200,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            address: true,
            lotNumber: true,
            createdAt: true,
            subdivision: {
                select: { name: true }
            }
        }
    })

    return jobs
}
