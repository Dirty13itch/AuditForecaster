'use server'

import { prisma } from "@/lib/prisma"
import puppeteer from 'puppeteer'
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
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })

        const page = await browser.newPage()
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

        await page.setCookie(...puppeteerCookies)

        await page.goto(`${baseUrl}/dashboard/reports/${jobId}`, {
            waitUntil: 'networkidle0'
        })

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm'
            }
        })

        await browser.close()
        const base64 = Buffer.from(pdfBuffer).toString('base64')

        return {
            success: true,
            pdf: base64,
            filename: `Report-${job.lotNumber}-${new Date().toISOString().split('T')[0]}.pdf`
        }
    } catch (error) {
        logger.error('PDF generation error', { error })
        return { error: 'Failed to generate PDF' }
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
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })

        const page = await browser.newPage()
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

        await page.setCookie(...puppeteerCookies)

        await page.goto(`${baseUrl}/dashboard/finances/invoices/${invoiceId}`, {
            waitUntil: 'networkidle0'
        })

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm'
            }
        })

        await browser.close()
        const base64 = Buffer.from(pdfBuffer).toString('base64')

        return {
            success: true,
            pdf: base64,
            filename: `Invoice-${invoice.number}.pdf`
        }
    } catch (error) {
        logger.error('Invoice PDF generation error', { error })
        return { error: 'Failed to generate Invoice PDF' }
    }
}
