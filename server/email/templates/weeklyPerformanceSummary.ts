export interface WeeklyPerformanceSummaryData {
  weekStart: string;
  weekEnd: string;
  jobsCompleted: number;
  passRate: number;
  averageACH50: number;
  photosUploaded: number;
  topAchievement?: string;
  comparisonToPreviousWeek?: {
    jobsChange: number;
    passRateChange: number;
  };
  unsubscribeUrl: string;
  recipientName?: string;
}

export function weeklyPerformanceSummaryTemplate(data: WeeklyPerformanceSummaryData): { subject: string; html: string } {
  const subject = 'Your Week in Review';

  const getChangeIndicator = (change: number) => {
    if (change > 0) return `<span style="color: #28A745;">↑ +${change}%</span>`;
    if (change < 0) return `<span style="color: #DC3545;">↓ ${change}%</span>`;
    return '<span style="color: #6C757D;">→ 0%</span>';
  };

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
            <td style="background: linear-gradient(135deg, #2E5BBA 0%, #17A2B8 100%); padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0 0 8px 0; color: #FFFFFF; font-size: 28px; font-weight: 700;">🏆 Weekly Performance Summary</h1>
              <p style="margin: 0; color: #FFFFFF; font-size: 14px; opacity: 0.9;">${data.weekStart} - ${data.weekEnd}</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              ${data.recipientName ? `<p style="margin: 0 0 24px 0; font-size: 16px; color: #212529;">Hi ${data.recipientName},</p>` : ''}
              
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #212529;">Here's a summary of your performance this week:</p>
              
              <!-- Stats Grid -->
              <table role="presentation" style="width: 100%; margin: 24px 0;">
                <tr>
                  <td style="width: 50%; padding: 0 8px 16px 0;">
                    <table role="presentation" style="width: 100%; border: 1px solid #DEE2E6; border-radius: 8px;">
                      <tr>
                        <td style="padding: 20px; text-align: center; background-color: #F8F9FA;">
                          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6C757D; text-transform: uppercase; letter-spacing: 0.5px;">Jobs Completed</p>
                          <p style="margin: 0; font-size: 36px; font-weight: 700; color: #2E5BBA;">${data.jobsCompleted}</p>
                          ${data.comparisonToPreviousWeek ? `
                          <p style="margin: 8px 0 0 0; font-size: 14px;">
                            ${getChangeIndicator(data.comparisonToPreviousWeek.jobsChange)} vs last week
                          </p>
                          ` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="width: 50%; padding: 0 0 16px 8px;">
                    <table role="presentation" style="width: 100%; border: 1px solid #DEE2E6; border-radius: 8px;">
                      <tr>
                        <td style="padding: 20px; text-align: center; background-color: #F8F9FA;">
                          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6C757D; text-transform: uppercase; letter-spacing: 0.5px;">Pass Rate</p>
                          <p style="margin: 0; font-size: 36px; font-weight: 700; color: ${data.passRate >= 80 ? '#28A745' : data.passRate >= 60 ? '#FFC107' : '#DC3545'};">${data.passRate.toFixed(1)}%</p>
                          ${data.comparisonToPreviousWeek ? `
                          <p style="margin: 8px 0 0 0; font-size: 14px;">
                            ${getChangeIndicator(data.comparisonToPreviousWeek.passRateChange)} vs last week
                          </p>
                          ` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="width: 50%; padding: 0 8px 0 0;">
                    <table role="presentation" style="width: 100%; border: 1px solid #DEE2E6; border-radius: 8px;">
                      <tr>
                        <td style="padding: 20px; text-align: center; background-color: #F8F9FA;">
                          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6C757D; text-transform: uppercase; letter-spacing: 0.5px;">Avg ACH50</p>
                          <p style="margin: 0; font-size: 36px; font-weight: 700; color: #17A2B8;">${data.averageACH50.toFixed(2)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="width: 50%; padding: 0 0 0 8px;">
                    <table role="presentation" style="width: 100%; border: 1px solid #DEE2E6; border-radius: 8px;">
                      <tr>
                        <td style="padding: 20px; text-align: center; background-color: #F8F9FA;">
                          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6C757D; text-transform: uppercase; letter-spacing: 0.5px;">Photos Uploaded</p>
                          <p style="margin: 0; font-size: 36px; font-weight: 700; color: #FD7E14;">${data.photosUploaded}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              ${data.topAchievement ? `
              <!-- Top Achievement -->
              <table role="presentation" style="width: 100%; background: linear-gradient(135deg, #FFF3CD 0%, #FFE69C 100%); border-radius: 8px; margin: 24px 0;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 32px;">🌟</p>
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #856404; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Top Achievement</p>
                    <p style="margin: 0; font-size: 18px; color: #212529; font-weight: 600;">${data.topAchievement}</p>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <!-- Encouragement Message -->
              <div style="margin: 32px 0 0 0; padding: 20px; background-color: #E8F4FD; border-radius: 8px; text-align: center;">
                <p style="margin: 0; font-size: 16px; color: #212529; font-weight: 500;">
                  ${data.passRate >= 90 ? '🎉 Outstanding work! Keep up the excellent performance!' :
                    data.passRate >= 80 ? '👍 Great job this week! You\'re doing well!' :
                    data.passRate >= 70 ? '💪 Good effort! Keep pushing for higher quality!' :
                    '📈 Focus on quality in the coming week - you can do it!'}
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #F8F9FA; border-radius: 0 0 8px 8px; border-top: 1px solid #DEE2E6;">
              <p style="margin: 0; font-size: 12px; color: #6C757D; text-align: center;">
                Ulrich Energy Auditing | Professional Energy Inspections
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #6C757D; text-align: center;">
                <a href="${data.unsubscribeUrl}" style="color: #2E5BBA; text-decoration: underline;">Unsubscribe from weekly summaries</a>
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
