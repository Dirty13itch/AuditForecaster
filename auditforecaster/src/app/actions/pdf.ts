'use server'

import { prisma } from "@/lib/prisma"
import puppeteer from 'puppeteer'

import { auth } from "@/auth"

export async function generatePDF(jobId: string) {
    const session = await auth()
    if (!session) return { error: 'Unauthorized' }
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

    try {
        // Launch headless browser
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })

        const page = await browser.newPage()

        // Navigate to the report page
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        await page.goto(`${baseUrl}/dashboard/reports/${jobId}`, {
            waitUntil: 'networkidle0'
        })

        // Generate PDF
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

        // Convert Uint8Array to base64
        const base64 = Buffer.from(pdfBuffer).toString('base64')

        return {
            success: true,
            pdf: base64,
            filename: `Report-${job.lotNumber}-${new Date().toISOString().split('T')[0]}.pdf`
        }
    } catch (error) {
        console.error('PDF generation error:', error)
        return { error: 'Failed to generate PDF' }
    }
}
