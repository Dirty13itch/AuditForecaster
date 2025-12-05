import { Job } from 'bullmq';
import puppeteer from 'puppeteer';
// import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sendEmailWithAttachment } from '@/lib/email';

// Define Job Payload
export interface ReportJobPayload {
    type: 'PDF' | 'INVOICE';
    id: string; // Job ID or Invoice ID
    cookies: { name: string; value: string; domain: string; path: string }[];
    userEmail: string;
    baseUrl: string;
}

export async function reportProcessor(job: Job<ReportJobPayload>) {
    const { type, id, cookies, userEmail, baseUrl } = job.data;
    logger.info(`[ReportWorker] Processing ${type} for ${id}`);

    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        
        // Set cookies for authentication
        if (cookies && cookies.length > 0) {
            await page.setCookie(...cookies);
        }

        const targetUrl = type === 'PDF' 
            ? `${baseUrl}/dashboard/reports/${id}`
            : `${baseUrl}/dashboard/finances/invoices/${id}`;

        logger.info(`[ReportWorker] Navigating to ${targetUrl}`);
        
        await page.goto(targetUrl, {
            waitUntil: 'networkidle0',
            timeout: 60000 // 60s timeout
        });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm'
            }
        });

        const filename = type === 'PDF'
            ? `Report-${id}.pdf` // Simplified name, can fetch details if needed
            : `Invoice-${id}.pdf`;

        // Send Email
        await sendEmailWithAttachment(
            userEmail,
            `Your ${type === 'PDF' ? 'Report' : 'Invoice'} is Ready`,
            `<p>Please find attached the requested ${type === 'PDF' ? 'report' : 'invoice'}.</p>`,
            [{ filename, content: Buffer.from(pdfBuffer) }]
        );
        
        logger.info(`[ReportWorker] Emailed ${filename} to ${userEmail}`);

        return { success: true, filename };

    } catch (error) {
        logger.error(`[ReportWorker] Failed to generate ${type}`, { error });
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
