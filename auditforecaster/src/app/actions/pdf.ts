'use server'

import { prisma } from "@/lib/prisma"
import { reportQueue } from "@/lib/queue"
// import puppeteer from 'puppeteer'
import { auth } from "@/auth"
import { cookies } from 'next/headers'
import { logger } from "@/lib/logger"

export async function generatePDF(jobId: string) {
    const session = await auth()
    if (!session?.user) return { error: 'Unauthorized' }

    // RBAC: Admin, Inspector, or Builder
    const role = session.user.role
    if (role !== 'ADMIN' && role !== 'INSPECTOR' && role !== 'BUILDER') {
        return { error: 'Unauthorized: Insufficient permissions' }
    }

    const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
            builder: true,
            inspector: true,
            inspections: {
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        }
    })

    if (!job || job.inspections.length === 0) {
        return { error: 'Job or inspection not found' }
    }

    // Builder Scope Check
    if (role === 'BUILDER' && session.user.builderId !== job.builderId) {
        return { error: 'Unauthorized: Access denied' }
    }

    try {
        const cookieStore = await cookies()
        const allCookies = cookieStore.getAll()
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const domain = new URL(baseUrl).hostname

        const puppeteerCookies = allCookies.map(c => ({
            name: c.name,
            value: c.value,
            domain: domain,
            path: '/',
        }))

        // Enqueue Job
        await reportQueue.add('generate:PDF', {
            type: 'PDF',
            id: jobId,
            cookies: puppeteerCookies,
            userEmail: session.user.email || 'notifications@ulrichenergy.com', // Fallback
            baseUrl
        });

        logger.info(`[PDF] Enqueued PDF generation for Job ${jobId}`);

        return {
            success: true,
            message: 'Report generation started. You will receive an email shortly.'
        }
    } catch (error) {
        logger.error('PDF generation error', { error })
        return { error: 'Failed to start PDF generation' }
    }
}

export async function generateInvoicePDF(invoiceId: string) {
    const session = await auth()
    if (!session?.user) return { error: 'Unauthorized' }

    // RBAC: Admin only for now (Builders might view later)
    const role = session.user.role
    if (role !== 'ADMIN') {
        return { error: 'Unauthorized: Admin access required' }
    }

    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
            builder: true,
            items: true
        }
    })

    if (!invoice) {
        return { error: 'Invoice not found' }
    }

    try {
        const cookieStore = await cookies()
        const allCookies = cookieStore.getAll()
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const domain = new URL(baseUrl).hostname

        const puppeteerCookies = allCookies.map(c => ({
            name: c.name,
            value: c.value,
            domain: domain,
            path: '/',
        }))

        // Enqueue Job
        await reportQueue.add('generate:INVOICE', {
            type: 'INVOICE',
            id: invoiceId,
            cookies: puppeteerCookies,
            userEmail: session.user.email || 'notifications@ulrichenergy.com',
            baseUrl
        });

        logger.info(`[PDF] Enqueued Invoice generation for Invoice ${invoiceId}`);

        return {
            success: true,
            message: 'Invoice generation started. You will receive an email shortly.'
        }
    } catch (error) {
        logger.error('Invoice PDF generation error', { error })
        return { error: 'Failed to start Invoice PDF generation' }
    }
}
