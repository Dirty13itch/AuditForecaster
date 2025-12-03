import { Resend } from 'resend';
import { logger } from '@/lib/logger';

const getResend = () => {
    if (process.env.RESEND_API_KEY) {
        return new Resend(process.env.RESEND_API_KEY);
    }
    return null;
};

export async function sendInspectionCompletedEmail(
    to: string,
    jobAddress: string,
    inspectorName: string,
    reportUrl: string
) {
    const resend = getResend();
    if (!resend || !process.env.RESEND_API_KEY) {
        logger.warn('Mocking email send (missing API key)', { to, jobAddress, inspectorName });
        return { success: true, id: 'mock-id' };
    }

    try {
        const data = await resend.emails.send({
            from: 'Ulrich Energy <notifications@ulrichenergy.com>', // Update with verified domain
            to: [to],
            subject: `Inspection Completed: ${jobAddress}`,
            html: `
                <h1>Inspection Completed</h1>
                <p>An inspection has been completed by <strong>${inspectorName}</strong> for the property at:</p>
                <p><strong>${jobAddress}</strong></p>
                <p>You can view the report here:</p>
                <a href="${reportUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Report</a>
            `
        });
        return { success: true, data };
    } catch (error) {
        logger.error('Failed to send inspection completed email', {
            to,
            jobAddress,
            error: error instanceof Error ? error.message : String(error)
        });
        return { success: false, error };
    }
}

export async function sendQARejectionEmail(
    to: string,
    jobAddress: string,
    rejectionReason: string,
    jobUrl: string
) {
    const resend = getResend();
    if (!resend || !process.env.RESEND_API_KEY) {
        logger.warn('Mocking email send (missing API key)', { to, jobAddress, rejectionReason });
        return { success: true, id: 'mock-id' };
    }

    try {
        const data = await resend.emails.send({
            from: 'Ulrich Energy <notifications@ulrichenergy.com>',
            to: [to],
            subject: `Action Required: Inspection Rejected for ${jobAddress}`,
            html: `
                <h1>Inspection Rejected</h1>
                <p>The inspection for <strong>${jobAddress}</strong> has been rejected by QA.</p>
                <p><strong>Reason:</strong> ${rejectionReason}</p>
                <p>Please review and correct the issues:</p>
                <a href="${jobUrl}" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Inspection</a>
            `
        });
        return { success: true, data };
    } catch (error) {
        logger.error('Failed to send QA rejection email', {
            to,
            jobAddress,
            rejectionReason,
            error: error instanceof Error ? error.message : String(error)
        });
        return { success: false, error };
    }
}
