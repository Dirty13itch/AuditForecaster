export interface CalendarEventNotificationData {
  eventTitle: string;
  startTime: string;
  endTime: string;
  location?: string;
  description?: string;
  googleCalendarUrl?: string;
  viewEventUrl: string;
  unsubscribeUrl: string;
  recipientName?: string;
  isUpdate?: boolean;
}

export function calendarEventNotificationTemplate(data: CalendarEventNotificationData): { subject: string; html: string } {
  const subject = `Calendar ${data.isUpdate ? 'Update' : 'Event'}: ${data.eventTitle}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Roboto', 'Open Sans', Arial, sans-serif; background-color: #F8F9FA;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #17A2B8; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 600;">📅 ${data.isUpdate ? 'Calendar Updated' : 'New Calendar Event'}</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              ${data.recipientName ? `<p style="margin: 0 0 20px 0; font-size: 16px; color: #212529;">Hi ${data.recipientName},</p>` : ''}
              
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #212529;">${data.isUpdate ? 'An event on your calendar has been updated:' : 'A new event has been added to your calendar:'}</p>
              
              <!-- Event Details Card -->
              <table role="presentation" style="width: 100%; border: 1px solid #DEE2E6; border-radius: 8px; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px; background-color: #F8F9FA;">
                    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #212529;">${data.eventTitle}</h2>
                    
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6C757D; width: 100px;">🕐 Start:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #212529; font-weight: 500;">${data.startTime}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6C757D;">🕐 End:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #212529; font-weight: 500;">${data.endTime}</td>
                      </tr>
                      ${data.location ? `
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6C757D;">📍 Location:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #212529; font-weight: 500;">${data.location}</td>
                      </tr>
                      ` : ''}
                    </table>
                    
                    ${data.description ? `
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #DEE2E6;">
                      <p style="margin: 0; font-size: 14px; color: #6C757D;">Description:</p>
                      <p style="margin: 8px 0 0 0; font-size: 14px; color: #212529;">${data.description}</p>
                    </div>
                    ` : ''}
                  </td>
                </tr>
              </table>
              
              <!-- CTA Buttons -->
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.viewEventUrl}" style="display: inline-block; background-color: #17A2B8; color: #FFFFFF; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; margin: 0 8px 8px 8px;">View in App</a>
                    ${data.googleCalendarUrl ? `
                    <a href="${data.googleCalendarUrl}" style="display: inline-block; background-color: #FFFFFF; color: #17A2B8; border: 2px solid #17A2B8; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; margin: 0 8px 8px 8px;">Add to Google Calendar</a>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #F8F9FA; border-radius: 0 0 8px 8px; border-top: 1px solid #DEE2E6;">
              <p style="margin: 0; font-size: 12px; color: #6C757D; text-align: center;">
                Ulrich Energy Auditing | Professional Energy Inspections
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #6C757D; text-align: center;">
                <a href="${data.unsubscribeUrl}" style="color: #2E5BBA; text-decoration: underline;">Unsubscribe from calendar notifications</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html };
}
