export interface DailyDigestJob {
  id: string;
  name: string;
  address: string;
  time: string;
  contractor: string;
  inspectionType: string;
}

export interface DailyDigestData {
  date: string;
  dayOfWeek: string;
  jobs: DailyDigestJob[];
  totalJobs: number;
  mapUrl?: string;
  weatherSummary?: string;
  estimatedDriveTime?: string;
  unsubscribeUrl: string;
  recipientName?: string;
}

export function dailyDigestTemplate(data: DailyDigestData): { subject: string; html: string } {
  const subject = `Your Schedule for ${data.dayOfWeek}, ${data.date}`;

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
              <h1 style="margin: 0 0 8px 0; color: #FFFFFF; font-size: 24px; font-weight: 600;">☀️ Good Morning!</h1>
              <p style="margin: 0; color: #FFFFFF; font-size: 16px; opacity: 0.9;">${data.dayOfWeek}, ${data.date}</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              ${data.recipientName ? `<p style="margin: 0 0 20px 0; font-size: 16px; color: #212529;">Hi ${data.recipientName},</p>` : ''}
              
              ${data.totalJobs === 0 ? `
                <p style="margin: 0 0 20px 0; font-size: 16px; color: #212529;">You have <strong>no scheduled jobs</strong> for today. Enjoy your day!</p>
              ` : `
                <p style="margin: 0 0 20px 0; font-size: 16px; color: #212529;">You have <strong>${data.totalJobs} job${data.totalJobs > 1 ? 's' : ''}</strong> scheduled for today:</p>
                
                ${data.weatherSummary ? `
                <div style="padding: 16px; background-color: #E8F4FD; border-left: 4px solid #17A2B8; border-radius: 4px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #212529;">🌤️ <strong>Weather:</strong> ${data.weatherSummary}</p>
                </div>
                ` : ''}
                
                ${data.estimatedDriveTime ? `
                <div style="padding: 16px; background-color: #FFF3CD; border-left: 4px solid #FFC107; border-radius: 4px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #856404;">🚗 <strong>Estimated Drive Time:</strong> ${data.estimatedDriveTime}</p>
                </div>
                ` : ''}
                
                <!-- Jobs List -->
                <div style="margin: 24px 0;">
                  ${data.jobs.map((job, index) => `
                    <table role="presentation" style="width: 100%; border: 1px solid #DEE2E6; border-radius: 8px; margin: ${index > 0 ? '16px' : '0'} 0;">
                      <tr>
                        <td style="padding: 16px; background-color: #F8F9FA;">
                          <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <span style="display: inline-block; background-color: #2E5BBA; color: #FFFFFF; font-weight: 700; font-size: 14px; padding: 4px 12px; border-radius: 4px; margin-right: 12px;">${job.time}</span>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #212529;">${job.name}</h3>
                          </div>
                          
                          <table role="presentation" style="width: 100%; margin-top: 12px;">
                            <tr>
                              <td style="padding: 4px 0; font-size: 14px; color: #6C757D; width: 120px;">📍 Address:</td>
                              <td style="padding: 4px 0; font-size: 14px; color: #212529;">${job.address}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; font-size: 14px; color: #6C757D;">👷 Contractor:</td>
                              <td style="padding: 4px 0; font-size: 14px; color: #212529;">${job.contractor}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; font-size: 14px; color: #6C757D;">🔍 Type:</td>
                              <td style="padding: 4px 0; font-size: 14px; color: #212529;">${job.inspectionType}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  `).join('')}
                </div>
                
                ${data.mapUrl ? `
                <!-- Map Link -->
                <table role="presentation" style="margin: 30px 0;">
                  <tr>
                    <td align="center">
                      <a href="${data.mapUrl}" style="display: inline-block; background-color: #FFFFFF; color: #2E5BBA; border: 2px solid #2E5BBA; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">🗺️ View Route Map</a>
                    </td>
                  </tr>
                </table>
                ` : ''}
              `}
              
              <p style="margin: 24px 0 0 0; font-size: 14px; color: #6C757D; text-align: center;">Have a productive day!</p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #F8F9FA; border-radius: 0 0 8px 8px; border-top: 1px solid #DEE2E6;">
              <p style="margin: 0; font-size: 12px; color: #6C757D; text-align: center;">
                Ulrich Energy Auditing | Professional Energy Inspections
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #6C757D; text-align: center;">
                <a href="${data.unsubscribeUrl}" style="color: #2E5BBA; text-decoration: underline;">Unsubscribe from daily digests</a>
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
