export interface JobStatusChangedData {
  jobName: string;
  address: string;
  status: string;
  failedItems?: string[];
  notes?: string;
  viewJobUrl: string;
  unsubscribeUrl: string;
  recipientName?: string;
}

export function jobStatusChangedTemplate(data: JobStatusChangedData): { subject: string; html: string } {
  const subject = `Job Failed: ${data.jobName}`;

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
            <td style="background-color: #DC3545; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 600;">⚠️ Job Status Update</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              ${data.recipientName ? `<p style="margin: 0 0 20px 0; font-size: 16px; color: #212529;">Hi ${data.recipientName},</p>` : ''}
              
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #212529;">The following job has <strong style="color: #DC3545;">failed inspection</strong> and requires attention:</p>
              
              <!-- Job Details Card -->
              <table role="presentation" style="width: 100%; border: 2px solid #DC3545; border-radius: 8px; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px; background-color: #FFF5F5;">
                    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #212529;">${data.jobName}</h2>
                    
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6C757D; width: 100px;">📍 Address:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #212529; font-weight: 500;">${data.address}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6C757D;">Status:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #DC3545; font-weight: 700; text-transform: uppercase;">${data.status}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              ${data.failedItems && data.failedItems.length > 0 ? `
              <!-- Failed Items -->
              <div style="margin: 20px 0;">
                <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #212529;">Items Requiring Attention:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #212529;">
                  ${data.failedItems.map(item => `<li style="margin: 6px 0; font-size: 14px;">${item}</li>`).join('')}
                </ul>
              </div>
              ` : ''}
              
              ${data.notes ? `
              <div style="padding: 16px; background-color: #FFF5F5; border-left: 4px solid #DC3545; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #212529;"><strong>Notes:</strong> ${data.notes}</p>
              </div>
              ` : ''}
              
              <!-- CTA Button -->
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.viewJobUrl}" style="display: inline-block; background-color: #DC3545; color: #FFFFFF; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">Review Job Details</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; font-size: 14px; color: #6C757D;">Please take appropriate action to address the failed items.</p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #F8F9FA; border-radius: 0 0 8px 8px; border-top: 1px solid #DEE2E6;">
              <p style="margin: 0; font-size: 12px; color: #6C757D; text-align: center;">
                Ulrich Energy Auditing | Professional Energy Inspections
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #6C757D; text-align: center;">
                <a href="${data.unsubscribeUrl}" style="color: #2E5BBA; text-decoration: underline;">Unsubscribe from status notifications</a>
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
