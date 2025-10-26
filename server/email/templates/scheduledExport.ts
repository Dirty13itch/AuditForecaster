import { format } from 'date-fns';

export interface ScheduledExportData {
  to: string[];
  subject: string;
  exportName: string;
  dataType: string;
  format: string;
  generatedAt: Date;
  attachment?: {
    filename: string;
    content: Buffer;
    type: string;
  };
}

export const scheduledExportTemplate = (data: ScheduledExportData) => {
  const formattedDate = format(data.generatedAt, 'PPP p');
  const dataTypeDisplay = data.dataType.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());
  
  return {
    to: data.to,
    subject: data.subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #2E5BBA 0%, #1e3a8a 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e1e1e1;
              border-top: none;
              border-radius: 0 0 10px 10px;
            }
            .info-box {
              background: #f8f9fa;
              border-left: 4px solid #2E5BBA;
              padding: 15px;
              margin: 20px 0;
            }
            .info-row {
              margin: 10px 0;
              display: flex;
              justify-content: space-between;
            }
            .label {
              font-weight: 600;
              color: #666;
            }
            .value {
              color: #333;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: #2E5BBA;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin-top: 20px;
            }
            .footer {
              text-align: center;
              color: #999;
              font-size: 14px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e1e1e1;
            }
            .icon {
              font-size: 48px;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="icon">📊</div>
              <h1>Scheduled Export Ready</h1>
            </div>
            
            <div class="content">
              <h2>Your scheduled export "${data.exportName}" is ready!</h2>
              
              <p>Your requested data export has been generated and is attached to this email.</p>
              
              <div class="info-box">
                <div class="info-row">
                  <span class="label">Export Name:</span>
                  <span class="value">${data.exportName}</span>
                </div>
                <div class="info-row">
                  <span class="label">Data Type:</span>
                  <span class="value">${dataTypeDisplay}</span>
                </div>
                <div class="info-row">
                  <span class="label">Format:</span>
                  <span class="value">${data.format.toUpperCase()}</span>
                </div>
                <div class="info-row">
                  <span class="label">Generated:</span>
                  <span class="value">${formattedDate}</span>
                </div>
                ${data.attachment ? `
                <div class="info-row">
                  <span class="label">File Name:</span>
                  <span class="value">${data.attachment.filename}</span>
                </div>
                ` : ''}
              </div>
              
              <p><strong>What's Next?</strong></p>
              <ul>
                <li>Open the attached file in your preferred application</li>
                <li>Review and analyze the exported data</li>
                <li>Share with team members as needed</li>
              </ul>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                <em>Note: This export contains data as of ${formattedDate}. For the most current data, please generate a new export from the application.</em>
              </p>
              
              <div class="footer">
                <p>This is an automated email from your Field Inspection System.</p>
                <p>To manage your scheduled exports, please visit the application settings.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    attachments: data.attachment ? [{
      filename: data.attachment.filename,
      content: data.attachment.content,
      contentType: data.attachment.type,
    }] : [],
  };
};