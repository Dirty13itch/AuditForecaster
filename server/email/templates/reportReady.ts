export interface ReportReadyData {
  jobName: string;
  address: string;
  completedDate: string;
  reportType: string;
  downloadUrl: string;
  expiresAt?: string;
  unsubscribeUrl: string;
  recipientName?: string;
}

export function reportReadyTemplate(data: ReportReadyData): { subject: string; html: string } {
  const subject = `Inspection Report Ready: ${data.jobName}`;

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
            <td style="background-color: #28A745; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 600;">✅ Report Ready</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              ${data.recipientName ? `<p style="margin: 0 0 20px 0; font-size: 16px; color: #212529;">Hi ${data.recipientName},</p>` : ''}
              
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #212529;">Your inspection report has been generated and is ready for download:</p>
              
              <!-- Job Details Card -->
              <table role="presentation" style="width: 100%; border: 1px solid #DEE2E6; border-radius: 8px; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px; background-color: #F8F9FA;">
                    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #212529;">${data.jobName}</h2>
                    
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6C757D; width: 140px;">📍 Address:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #212529; font-weight: 500;">${data.address}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6C757D;">📄 Report Type:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #212529; font-weight: 500;">${data.reportType}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6C757D;">✅ Completed:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #212529; font-weight: 500;">${data.completedDate}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              ${data.expiresAt ? `
              <div style="padding: 16px; background-color: #FFF3CD; border-left: 4px solid #FFC107; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #856404;">⏰ This download link expires on <strong>${data.expiresAt}</strong></p>
              </div>
              ` : ''}
              
              <!-- CTA Button -->
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.downloadUrl}" style="display: inline-block; background-color: #28A745; color: #FFFFFF; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">Download Report PDF</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; font-size: 14px; color: #6C757D; text-align: center;">The report includes all inspection details, photos, and compliance information.</p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #F8F9FA; border-radius: 0 0 8px 8px; border-top: 1px solid #DEE2E6;">
              <p style="margin: 0; font-size: 12px; color: #6C757D; text-align: center;">
                Ulrich Energy Auditing | Professional Energy Inspections
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #6C757D; text-align: center;">
                <a href="${data.unsubscribeUrl}" style="color: #2E5BBA; text-decoration: underline;">Unsubscribe from report notifications</a>
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
