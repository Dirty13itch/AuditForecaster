import sgMail from '@sendgrid/mail';
import { serverLogger } from '../logger';

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Email rate limiting tracker
const emailRateLimit = new Map<string, { count: number; resetTime: number }>();
const MAX_EMAILS_PER_HOUR = 100;

class EmailService {
  private isConfigured: boolean = false;
  private isEnabled: boolean = false;
  private fromEmail: string = 'noreply@ulrichenergyauditing.com';

  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    const enabled = process.env.SENDGRID_ENABLED !== 'false';
    const fromEmail = process.env.FROM_EMAIL;

    if (fromEmail) {
      this.fromEmail = fromEmail;
    }

    if (apiKey) {
      try {
        sgMail.setApiKey(apiKey);
        this.isConfigured = true;
        this.isEnabled = enabled;
        serverLogger.info('[Email] SendGrid configured successfully', { fromEmail: this.fromEmail });
      } catch (error) {
        serverLogger.error('[Email] Failed to configure SendGrid', { error });
        this.isConfigured = false;
      }
    } else {
      serverLogger.warn('[Email] SENDGRID_API_KEY not configured - emails will be logged to console');
    }
  }

  private checkRateLimit(recipient: string): boolean {
    const now = Date.now();
    const limit = emailRateLimit.get(recipient);

    if (!limit || now > limit.resetTime) {
      emailRateLimit.set(recipient, {
        count: 1,
        resetTime: now + 60 * 60 * 1000, // 1 hour
      });
      return true;
    }

    if (limit.count >= MAX_EMAILS_PER_HOUR) {
      serverLogger.warn('[Email] Rate limit exceeded', { recipient, count: limit.count });
      return false;
    }

    limit.count++;
    return true;
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string
  ): Promise<EmailResult> {
    // Check rate limit
    if (!this.checkRateLimit(to)) {
      return {
        success: false,
        error: 'Rate limit exceeded - max 100 emails per hour',
      };
    }

    // If not configured or not enabled, log to console
    if (!this.isConfigured || !this.isEnabled) {
      serverLogger.info('[Email] Email would be sent (SendGrid not configured/enabled)', {
        to,
        subject,
        html: html.substring(0, 200) + '...',
        text: text?.substring(0, 200),
      });
      return {
        success: true,
        messageId: `dev-${Date.now()}`,
      };
    }

    try {
      const msg = {
        to,
        from: this.fromEmail,
        subject,
        html,
        text: text || this.htmlToText(html),
      };

      const [response] = await sgMail.send(msg);

      serverLogger.info('[Email] Email sent successfully', {
        to,
        subject,
        messageId: response.headers['x-message-id'],
        statusCode: response.statusCode,
      });

      return {
        success: true,
        messageId: response.headers['x-message-id'] as string,
      };
    } catch (error: any) {
      serverLogger.error('[Email] Failed to send email', {
        to,
        subject,
        error: error.message,
        statusCode: error.code,
      });

      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  isReady(): boolean {
    return this.isConfigured && this.isEnabled;
  }

  getFromEmail(): string {
    return this.fromEmail;
  }
}

export const emailService = new EmailService();
export type { EmailResult };
