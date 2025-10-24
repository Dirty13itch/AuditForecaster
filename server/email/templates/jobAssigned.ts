export interface JobAssignedData {
  jobName: string;
  address: string;
  scheduledDate: string;
  builderName: string;
  contractor: string;
  inspectionType: string;
  viewJobUrl: string;
  unsubscribeUrl: string;
  recipientName?: string;
}

export function jobAssignedTemplate(data: JobAssignedData): { subject: string; html: string } {
  const subject = `New Job Assigned: ${data.jobName}`;

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
            <td style="background-color: #2E5BBA; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 600;">New Job Assigned</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              ${data.recipientName ? `<p style="margin: 0 0 20px 0; font-size: 16px; color: #212529;">Hi ${data.recipientName},</p>` : ''}
              
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #212529;">You've been assigned a new inspection job:</p>
              
              <!-- Job Details Card -->
              <table role="presentation" style="width: 100%; border: 1px solid #DEE2E6; border-radius: 8px; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px; background-color: #F8F9FA; border-radius: 8px;">
                    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #212529;">${data.jobName}</h2>
                    
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6C757D; width: 140px;">📍 Address:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #212529; font-weight: 500;">${data.address}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6C757D;">📅 Scheduled:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #212529; font-weight: 500;">${data.scheduledDate}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6C757D;">🏗️ Builder:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #212529; font-weight: 500;">${data.builderName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6C757D;">👷 Contractor:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #212529; font-weight: 500;">${data.contractor}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6C757D;">🔍 Type:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #212529; font-weight: 500;">${data.inspectionType}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.viewJobUrl}" style="display: inline-block; background-color: #2E5BBA; color: #FFFFFF; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">View Job Details</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; font-size: 14px; color: #6C757D;">Make sure you're prepared for the inspection and have all necessary equipment.</p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #F8F9FA; border-radius: 0 0 8px 8px; border-top: 1px solid #DEE2E6;">
              <p style="margin: 0; font-size: 12px; color: #6C757D; text-align: center;">
                Ulrich Energy Auditing | Professional Energy Inspections
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #6C757D; text-align: center;">
                <a href="${data.unsubscribeUrl}" style="color: #2E5BBA; text-decoration: underline;">Unsubscribe from job notifications</a>
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
