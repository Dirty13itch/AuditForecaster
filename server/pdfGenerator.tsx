import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';
import { renderToBuffer } from '@react-pdf/renderer';
import type { Job, Builder, ChecklistItem, Photo, Forecast, ReportInstance } from '@shared/schema';
import { calculateScore } from '../shared/scoring';
import { safeToFixed, safeParseFloat, safeDivide } from '../shared/numberUtils';
import { serverLogger } from './logger';

interface ReportSection {
  id: string;
  title: string;
  type: "Text" | "Photos" | "Checklist" | "Forecast" | "Signature";
  order: number;
}

interface ReportData {
  inspector?: string;
  overview?: string;
  recommendations?: string;
  [key: string]: string | number | boolean | null | undefined;
}

interface PDFGenerationData {
  reportInstance: ReportInstance;
  job: Job;
  builder?: Builder;
  checklistItems: ChecklistItem[];
  photos: Photo[];
  forecasts: Forecast[];
  templateSections: ReportSection[];
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottom: '2 solid #2E5BBA',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E5BBA',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6C757D',
  },
  section: {
    marginTop: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: '1 solid #DEE2E6',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: '30%',
    fontWeight: 'bold',
    color: '#495057',
  },
  value: {
    width: '70%',
    color: '#212529',
  },
  card: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    marginBottom: 10,
    borderRadius: 4,
    border: '1 solid #DEE2E6',
  },
  checklistItem: {
    flexDirection: 'row',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    border: '1 solid #DEE2E6',
  },
  checklistNumber: {
    width: 40,
    fontWeight: 'bold',
    color: '#2E5BBA',
  },
  checklistContent: {
    flex: 1,
  },
  checklistTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  checklistStatus: {
    fontSize: 10,
    color: '#6C757D',
    marginBottom: 2,
  },
  checklistNotes: {
    fontSize: 9,
    color: '#495057',
    fontStyle: 'italic',
    marginTop: 4,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoContainer: {
    width: '48%',
    marginBottom: 10,
  },
  photo: {
    width: '100%',
    height: 200,
    objectFit: 'cover',
    borderRadius: 4,
    border: '1 solid #DEE2E6',
  },
  photoCaption: {
    fontSize: 9,
    color: '#6C757D',
    marginTop: 4,
    textAlign: 'center',
  },
  forecastGrid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 15,
  },
  forecastCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 4,
    border: '1 solid #DEE2E6',
  },
  forecastLabel: {
    fontSize: 9,
    color: '#6C757D',
    marginBottom: 4,
  },
  forecastValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  forecastUnit: {
    fontSize: 10,
    color: '#6C757D',
  },
  comparisonTable: {
    marginTop: 15,
    border: '1 solid #DEE2E6',
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#E9ECEF',
    padding: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderTop: '1 solid #DEE2E6',
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
  },
  signatureContainer: {
    marginTop: 10,
  },
  signatureImage: {
    width: 200,
    height: 100,
    objectFit: 'contain',
    border: '1 solid #DEE2E6',
    borderRadius: 4,
    marginBottom: 8,
  },
  signatureName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  signatureDate: {
    fontSize: 9,
    color: '#6C757D',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTop: '1 solid #DEE2E6',
    fontSize: 9,
    color: '#6C757D',
  },
  badge: {
    padding: '2 6',
    backgroundColor: '#28A745',
    color: '#FFFFFF',
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
  },
  badgePending: {
    backgroundColor: '#FFC107',
  },
  badgeFailed: {
    backgroundColor: '#DC3545',
  },
  scoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  scoreCard: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 4,
    border: '1 solid #DEE2E6',
    minWidth: 100,
  },
  scoreLabel: {
    fontSize: 9,
    color: '#6C757D',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  scoreBreakdown: {
    marginTop: 15,
    flexDirection: 'row',
    gap: 20,
  },
  scoreBreakdownItem: {
    flex: 1,
  },
});

function ReportHeader({ job, reportData }: { job: Job; reportData: ReportData }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Inspection Report</Text>
      <Text style={styles.headerSubtitle}>
        Generated on {new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </Text>
    </View>
  );
}

function JobInformationSection({ job, builder }: { job: Job; builder?: Builder }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Job Information</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Job Name:</Text>
          <Text style={styles.value}>{job.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Address:</Text>
          <Text style={styles.value}>{job.address}</Text>
        </View>
        {builder && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Builder:</Text>
              <Text style={styles.value}>{builder.name} ({builder.companyName})</Text>
            </View>
            {builder.phone && (
              <View style={styles.row}>
                <Text style={styles.label}>Builder Contact:</Text>
                <Text style={styles.value}>{builder.phone}</Text>
              </View>
            )}
          </>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Contractor:</Text>
          <Text style={styles.value}>{job.contractor}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{job.status}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Inspection Type:</Text>
          <Text style={styles.value}>{job.inspectionType}</Text>
        </View>
        {job.scheduledDate && (
          <View style={styles.row}>
            <Text style={styles.label}>Scheduled Date:</Text>
            <Text style={styles.value}>
              {new Date(job.scheduledDate).toLocaleDateString('en-US')}
            </Text>
          </View>
        )}
        {job.completedDate && (
          <View style={styles.row}>
            <Text style={styles.label}>Completed Date:</Text>
            <Text style={styles.value}>
              {new Date(job.completedDate).toLocaleDateString('en-US')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ScoreSummarySection({ checklistItems }: { checklistItems: ChecklistItem[] }) {
  const score = calculateScore(checklistItems);
  
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Inspection Score</Text>
      <View style={styles.scoreGrid}>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Pass Rate</Text>
          <Text style={styles.scoreValue}>{safeToFixed(score.passRate, 1)}%</Text>
        </View>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Grade</Text>
          <Text style={styles.scoreValue}>{score.grade}</Text>
        </View>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Completion</Text>
          <Text style={styles.scoreValue}>{safeToFixed(score.completionRate, 1)}%</Text>
        </View>
      </View>
      <View style={styles.scoreBreakdown}>
        <View style={styles.scoreBreakdownItem}>
          <Text style={styles.scoreLabel}>Passed</Text>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#28A745' }}>
            {score.passedItems} / {score.totalItems}
          </Text>
        </View>
        <View style={styles.scoreBreakdownItem}>
          <Text style={styles.scoreLabel}>Failed</Text>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#DC3545' }}>
            {score.failedItems} / {score.totalItems}
          </Text>
        </View>
        <View style={styles.scoreBreakdownItem}>
          <Text style={styles.scoreLabel}>Pending</Text>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#FFC107' }}>
            {score.pendingItems} / {score.totalItems}
          </Text>
        </View>
        <View style={styles.scoreBreakdownItem}>
          <Text style={styles.scoreLabel}>N/A</Text>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#6C757D' }}>
            {score.notApplicableItems} / {score.totalItems}
          </Text>
        </View>
      </View>
    </View>
  );
}

function InspectionSummarySection({ job, checklistItems }: { job: Job; checklistItems: ChecklistItem[] }) {
  const completedCount = checklistItems.filter(item => item.completed).length;
  const totalCount = checklistItems.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Inspection Summary</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Total Items:</Text>
          <Text style={styles.value}>{totalCount}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Completed Items:</Text>
          <Text style={styles.value}>{completedCount}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Completion:</Text>
          <Text style={styles.value}>{completionPercentage}%</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total Photos:</Text>
          <Text style={styles.value}>
            {checklistItems.reduce((sum, item) => sum + (item.photoCount || 0), 0)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ChecklistSection({ checklistItems }: { checklistItems: ChecklistItem[] }) {
  return (
    <View style={styles.section} break>
      <Text style={styles.sectionTitle}>Checklist Items</Text>
      {checklistItems.map((item) => (
        <View key={item.id} style={styles.checklistItem}>
          <Text style={styles.checklistNumber}>#{item.itemNumber}</Text>
          <View style={styles.checklistContent}>
            <Text style={styles.checklistTitle}>{item.title}</Text>
            <Text style={styles.checklistStatus}>
              Status: {item.completed ? '✓ Completed' : '○ Pending'}
              {item.photoCount && item.photoCount > 0 && ` • ${item.photoCount} photo(s)`}
              {item.voiceNoteUrl && item.voiceNoteDuration && 
                ` • Voice note (${Math.round(item.voiceNoteDuration / 1000)}s)`}
            </Text>
            {item.notes && (
              <Text style={styles.checklistNotes}>Notes: {item.notes}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

function PhotosSection({ photos }: { photos: Photo[] }) {
  if (photos.length === 0) return null;

  return (
    <View style={styles.section} break>
      <Text style={styles.sectionTitle}>Photos ({photos.length})</Text>
      <View style={styles.photoGrid}>
        {photos.map((photo, index) => (
          <View key={photo.id} style={styles.photoContainer}>
            <Image 
              src={photo.filePath} 
              style={styles.photo}
            />
            {photo.caption && (
              <Text style={styles.photoCaption}>{photo.caption}</Text>
            )}
            {photo.tags && photo.tags.length > 0 && (
              <Text style={styles.photoCaption}>
                Tags: {photo.tags.join(', ')}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function ForecastSection({ forecasts }: { forecasts: Forecast[] }) {
  if (forecasts.length === 0) return null;

  const forecast = forecasts[0];

  return (
    <View style={styles.section} break>
      <Text style={styles.sectionTitle}>Duct Leakage Forecast</Text>
      
      <View style={styles.forecastGrid}>
        <View style={styles.forecastCard}>
          <Text style={styles.forecastLabel}>Predicted TDL</Text>
          <Text style={styles.forecastValue}>
            {forecast.predictedTdl} <Text style={styles.forecastUnit}>CFM25</Text>
          </Text>
        </View>
        <View style={styles.forecastCard}>
          <Text style={styles.forecastLabel}>Predicted DLO</Text>
          <Text style={styles.forecastValue}>
            {forecast.predictedDlo} <Text style={styles.forecastUnit}>%</Text>
          </Text>
        </View>
      </View>

      {(forecast.actualTdl || forecast.actualDlo) && (
        <>
          <View style={styles.forecastGrid}>
            <View style={styles.forecastCard}>
              <Text style={styles.forecastLabel}>Actual TDL</Text>
              <Text style={styles.forecastValue}>
                {forecast.actualTdl || 'N/A'} {forecast.actualTdl && <Text style={styles.forecastUnit}>CFM25</Text>}
              </Text>
            </View>
            <View style={styles.forecastCard}>
              <Text style={styles.forecastLabel}>Actual DLO</Text>
              <Text style={styles.forecastValue}>
                {forecast.actualDlo || 'N/A'} {forecast.actualDlo && <Text style={styles.forecastUnit}>%</Text>}
              </Text>
            </View>
          </View>

          <View style={styles.comparisonTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Metric</Text>
              <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Predicted</Text>
              <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Actual</Text>
              <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Variance</Text>
            </View>
            {forecast.actualTdl && forecast.predictedTdl && (
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>TDL</Text>
                <Text style={styles.tableCell}>{forecast.predictedTdl} CFM25</Text>
                <Text style={styles.tableCell}>{forecast.actualTdl} CFM25</Text>
                <Text style={styles.tableCell}>
                  {safeToFixed(safeDivide(safeParseFloat(forecast.actualTdl) - safeParseFloat(forecast.predictedTdl), safeParseFloat(forecast.predictedTdl)) * 100, 1)}%
                </Text>
              </View>
            )}
            {forecast.actualDlo && forecast.predictedDlo && (
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>DLO</Text>
                <Text style={styles.tableCell}>{forecast.predictedDlo}%</Text>
                <Text style={styles.tableCell}>{forecast.actualDlo}%</Text>
                <Text style={styles.tableCell}>
                  {safeToFixed(safeDivide(safeParseFloat(forecast.actualDlo) - safeParseFloat(forecast.predictedDlo), safeParseFloat(forecast.predictedDlo)) * 100, 1)}%
                </Text>
              </View>
            )}
          </View>
        </>
      )}

      {forecast.confidence && (
        <Text style={{ fontSize: 9, color: '#6C757D', marginTop: 10 }}>
          Prediction Confidence: {forecast.confidence}%
        </Text>
      )}
    </View>
  );
}

function SignatureSection({ job, builder }: { job: Job; builder?: Builder }) {
  if (!job.builderSignatureUrl) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Builder Signature</Text>
      <View style={styles.signatureContainer}>
        <Image 
          src={job.builderSignatureUrl} 
          style={styles.signatureImage}
        />
        {job.builderSignerName && (
          <Text style={styles.signatureName}>{job.builderSignerName}</Text>
        )}
        {builder && (
          <Text style={{ fontSize: 10, color: '#6C757D', marginBottom: 2 }}>
            {builder.companyName}
          </Text>
        )}
        {job.builderSignedAt && (
          <Text style={styles.signatureDate}>
            Signed on {new Date(job.builderSignedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        )}
      </View>
    </View>
  );
}

function ReportFooter({ reportData, pageNumber, totalPages }: { reportData: ReportData; pageNumber: number; totalPages: number }) {
  return (
    <View style={styles.footer} fixed>
      <Text>
        {reportData.inspector ? `Inspector: ${reportData.inspector}` : 'Energy Audit Report'}
      </Text>
      <Text>Page {pageNumber} of {totalPages}</Text>
    </View>
  );
}

function InspectionReportDocument({ data }: { data: PDFGenerationData }) {
  const reportData = JSON.parse(data.reportInstance.data);
  const sections = data.templateSections;

  const hasChecklistSection = sections.some(s => s.type === 'Checklist');
  const hasPhotosSection = sections.some(s => s.type === 'Photos');
  const hasForecastSection = sections.some(s => s.type === 'Forecast');

  // Calculate total pages dynamically
  let totalPages = 2; // Always have first page and last page
  if (hasPhotosSection && data.photos.length > 0) {
    totalPages++;
  }
  if (hasForecastSection && data.forecasts.length > 0) {
    totalPages++;
  }

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <ReportHeader job={data.job} reportData={reportData} />
        
        <JobInformationSection job={data.job} builder={data.builder} />
        
        {hasChecklistSection && data.checklistItems.length > 0 && (
          <>
            <ScoreSummarySection checklistItems={data.checklistItems} />
            <InspectionSummarySection job={data.job} checklistItems={data.checklistItems} />
          </>
        )}

        {reportData.overview && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={{ fontSize: 10, color: '#495057', lineHeight: 1.5 }}>
              {reportData.overview}
            </Text>
          </View>
        )}

        {hasChecklistSection && data.checklistItems.length > 0 && (
          <ChecklistSection checklistItems={data.checklistItems} />
        )}
        
        <ReportFooter reportData={reportData} pageNumber={1} totalPages={totalPages} />
      </Page>

      {hasPhotosSection && data.photos.length > 0 && (
        <Page size="LETTER" style={styles.page}>
          <PhotosSection photos={data.photos} />
          <ReportFooter reportData={reportData} pageNumber={2} totalPages={totalPages} />
        </Page>
      )}

      {hasForecastSection && data.forecasts.length > 0 && (
        <Page size="LETTER" style={styles.page}>
          <ForecastSection forecasts={data.forecasts} />
          <ReportFooter 
            reportData={reportData} 
            pageNumber={hasPhotosSection && data.photos.length > 0 ? 3 : 2} 
            totalPages={totalPages} 
          />
        </Page>
      )}

      <Page size="LETTER" style={styles.page}>
        <SignatureSection job={data.job} builder={data.builder} />

        {reportData.finalNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Final Notes</Text>
            <Text style={{ fontSize: 10, color: '#495057', lineHeight: 1.5 }}>
              {reportData.finalNotes}
            </Text>
          </View>
        )}

        <ReportFooter reportData={reportData} pageNumber={totalPages} totalPages={totalPages} />
      </Page>
    </Document>
  );
}

export async function generateReportPDF(data: PDFGenerationData): Promise<Buffer> {
  // Add breadcrumb for PDF generation start
  const { addBreadcrumb } = await import('./sentry');
  addBreadcrumb('pdf', 'Starting PDF generation', {
    jobId: data.job.id,
    jobName: data.job.name,
    sectionsCount: data.templateSections.length
  });
  
  try {
    const pdfDocument = <InspectionReportDocument data={data} />;
    const buffer = await renderToBuffer(pdfDocument);
    
    // Add breadcrumb for successful PDF generation
    addBreadcrumb('pdf', 'PDF generated successfully', {
      jobId: data.job.id,
      sizeKB: (buffer.length / 1024).toFixed(2)
    });
    
    return buffer;
  } catch (error) {
    // Add breadcrumb for PDF generation failure
    addBreadcrumb('pdf', 'PDF generation failed', {
      jobId: data.job.id,
      error: error instanceof Error ? error.message : String(error)
    }, 'error');
    
    serverLogger.error('Error generating PDF:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

interface DashboardPDFData {
  summary: {
    totalInspections: number;
    averageACH50: number;
    tierDistribution: Array<{ tier: string; count: number; percentage: number; color: string }>;
    passRate: number;
    failRate: number;
    tax45LEligibleCount: number;
    totalPotentialTaxCredits: number;
    monthlyHighlights: Array<{ label: string; value: string | number; type: 'success' | 'info' | 'warning' }>;
  };
  leaderboard: Array<{
    builderId: string;
    builderName: string;
    averageACH50: number;
    tier: string;
    totalJobs: number;
    passRate: number;
  }>;
}

const dashboardStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    paddingBottom: 15,
    borderBottom: '2 solid #2E5BBA',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E5BBA',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6C757D',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 25,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 4,
    border: '1 solid #DEE2E6',
  },
  metricLabel: {
    fontSize: 9,
    color: '#6C757D',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 3,
  },
  metricSubtext: {
    fontSize: 8,
    color: '#6C757D',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 12,
    paddingBottom: 6,
    borderBottom: '1 solid #DEE2E6',
  },
  tierGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tierCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 4,
    border: '1 solid #DEE2E6',
    marginBottom: 8,
  },
  tierName: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  tierStats: {
    fontSize: 9,
    color: '#495057',
    marginBottom: 2,
  },
  tierBar: {
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  leaderboardTable: {
    border: '1 solid #DEE2E6',
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#E9ECEF',
    padding: 10,
    borderBottom: '1 solid #DEE2E6',
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#495057',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottom: '1 solid #F8F9FA',
  },
  tableCell: {
    fontSize: 10,
    color: '#212529',
  },
  highlightCard: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 4,
    marginBottom: 8,
    border: '1 solid #DEE2E6',
  },
  highlightLabel: {
    fontSize: 9,
    color: '#6C757D',
    marginBottom: 4,
  },
  highlightValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212529',
  },
  taxCreditPanel: {
    backgroundColor: '#FFF9E6',
    padding: 15,
    borderRadius: 4,
    border: '1 solid #FFC107',
  },
  taxCreditTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 10,
  },
  taxCreditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  taxCreditLabel: {
    fontSize: 10,
    color: '#856404',
  },
  taxCreditValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#856404',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTop: '1 solid #DEE2E6',
    fontSize: 9,
    color: '#6C757D',
  },
  legend: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 4,
  },
  legendTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 8,
    color: '#495057',
  },
});

function DashboardHeader() {
  return (
    <View style={dashboardStyles.header}>
      <Text style={dashboardStyles.headerTitle}>Builder Performance Dashboard</Text>
      <Text style={dashboardStyles.headerSubtitle}>
        Generated on {new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </Text>
    </View>
  );
}

function MetricsSection({ summary }: { summary: DashboardPDFData['summary'] }) {
  return (
    <View style={dashboardStyles.metricsGrid}>
      <View style={dashboardStyles.metricCard}>
        <Text style={dashboardStyles.metricLabel}>Total Inspections</Text>
        <Text style={dashboardStyles.metricValue}>{summary.totalInspections}</Text>
        <Text style={dashboardStyles.metricSubtext}>Completed</Text>
      </View>
      <View style={dashboardStyles.metricCard}>
        <Text style={dashboardStyles.metricLabel}>Average ACH50</Text>
        <Text style={dashboardStyles.metricValue}>{summary.averageACH50.toFixed(2)}</Text>
        <Text style={dashboardStyles.metricSubtext}>Lower is better</Text>
      </View>
      <View style={dashboardStyles.metricCard}>
        <Text style={dashboardStyles.metricLabel}>Pass Rate</Text>
        <Text style={[dashboardStyles.metricValue, { color: '#28A745' }]}>
          {summary.passRate.toFixed(1)}%
        </Text>
        <Text style={dashboardStyles.metricSubtext}>≤3.0 ACH50</Text>
      </View>
      <View style={dashboardStyles.metricCard}>
        <Text style={dashboardStyles.metricLabel}>45L Eligible</Text>
        <Text style={dashboardStyles.metricValue}>{summary.tax45LEligibleCount}</Text>
        <Text style={dashboardStyles.metricSubtext}>Homes</Text>
      </View>
    </View>
  );
}

function TierDistributionSection({ summary }: { summary: DashboardPDFData['summary'] }) {
  return (
    <View style={dashboardStyles.section}>
      <Text style={dashboardStyles.sectionTitle}>Tier Distribution</Text>
      <View style={dashboardStyles.tierGrid}>
        {summary.tierDistribution.map((tier) => (
          <View key={tier.tier} style={dashboardStyles.tierCard}>
            <Text style={[dashboardStyles.tierName, { color: tier.color }]}>
              {tier.tier}
            </Text>
            <Text style={dashboardStyles.tierStats}>
              Count: {tier.count} ({tier.percentage.toFixed(1)}%)
            </Text>
            <View 
              style={[
                dashboardStyles.tierBar, 
                { 
                  backgroundColor: tier.color,
                  width: `${tier.percentage}%`
                }
              ]} 
            />
          </View>
        ))}
      </View>
      <View style={dashboardStyles.legend}>
        <Text style={dashboardStyles.legendTitle}>ACH50 Tier Ranges:</Text>
        <View style={dashboardStyles.legendItem}>
          <View style={[dashboardStyles.legendDot, { backgroundColor: '#0B7285' }]} />
          <Text style={dashboardStyles.legendText}>Elite: 0.5 - 1.0</Text>
        </View>
        <View style={dashboardStyles.legendItem}>
          <View style={[dashboardStyles.legendDot, { backgroundColor: '#2E8B57' }]} />
          <Text style={dashboardStyles.legendText}>Excellent: 1.0 - 1.5</Text>
        </View>
        <View style={dashboardStyles.legendItem}>
          <View style={[dashboardStyles.legendDot, { backgroundColor: '#3FA34D' }]} />
          <Text style={dashboardStyles.legendText}>Very Good: 1.5 - 2.0</Text>
        </View>
        <View style={dashboardStyles.legendItem}>
          <View style={[dashboardStyles.legendDot, { backgroundColor: '#A0C34E' }]} />
          <Text style={dashboardStyles.legendText}>Good: 2.0 - 2.5</Text>
        </View>
        <View style={dashboardStyles.legendItem}>
          <View style={[dashboardStyles.legendDot, { backgroundColor: '#FFC107' }]} />
          <Text style={dashboardStyles.legendText}>Passing: 2.5 - 3.0</Text>
        </View>
        <View style={dashboardStyles.legendItem}>
          <View style={[dashboardStyles.legendDot, { backgroundColor: '#DC3545' }]} />
          <Text style={dashboardStyles.legendText}>Failing: {">"}  3.0</Text>
        </View>
      </View>
    </View>
  );
}

function LeaderboardSection({ leaderboard }: { leaderboard: DashboardPDFData['leaderboard'] }) {
  if (leaderboard.length === 0) return null;

  const top10 = leaderboard.slice(0, 10);

  return (
    <View style={dashboardStyles.section} break>
      <Text style={dashboardStyles.sectionTitle}>Builder Leaderboard (Top 10)</Text>
      <View style={dashboardStyles.leaderboardTable}>
        <View style={dashboardStyles.tableHeader}>
          <Text style={[dashboardStyles.tableHeaderCell, { width: '30%' }]}>Builder</Text>
          <Text style={[dashboardStyles.tableHeaderCell, { width: '20%', textAlign: 'center' }]}>Avg ACH50</Text>
          <Text style={[dashboardStyles.tableHeaderCell, { width: '20%', textAlign: 'center' }]}>Tier</Text>
          <Text style={[dashboardStyles.tableHeaderCell, { width: '15%', textAlign: 'center' }]}>Jobs</Text>
          <Text style={[dashboardStyles.tableHeaderCell, { width: '15%', textAlign: 'center' }]}>Pass %</Text>
        </View>
        {top10.map((entry, index) => (
          <View key={entry.builderId} style={dashboardStyles.tableRow}>
            <Text style={[dashboardStyles.tableCell, { width: '30%' }]}>
              {index + 1}. {entry.builderName}
            </Text>
            <Text style={[dashboardStyles.tableCell, { width: '20%', textAlign: 'center' }]}>
              {entry.averageACH50.toFixed(2)}
            </Text>
            <Text style={[dashboardStyles.tableCell, { width: '20%', textAlign: 'center' }]}>
              {entry.tier}
            </Text>
            <Text style={[dashboardStyles.tableCell, { width: '15%', textAlign: 'center' }]}>
              {entry.totalJobs}
            </Text>
            <Text style={[dashboardStyles.tableCell, { width: '15%', textAlign: 'center' }]}>
              {entry.passRate.toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function HighlightsSection({ highlights }: { highlights: DashboardPDFData['summary']['monthlyHighlights'] }) {
  if (highlights.length === 0) return null;

  return (
    <View style={dashboardStyles.section}>
      <Text style={dashboardStyles.sectionTitle}>Monthly Highlights</Text>
      {highlights.map((highlight, index) => (
        <View key={index} style={dashboardStyles.highlightCard}>
          <Text style={dashboardStyles.highlightLabel}>{highlight.label}</Text>
          <Text style={dashboardStyles.highlightValue}>{highlight.value}</Text>
        </View>
      ))}
    </View>
  );
}

function TaxCreditSection({ summary }: { summary: DashboardPDFData['summary'] }) {
  const creditsPerHome = 5000;
  const totalCredits = summary.tax45LEligibleCount * creditsPerHome;

  return (
    <View style={dashboardStyles.section}>
      <Text style={dashboardStyles.sectionTitle}>Tax Credit Summary</Text>
      <View style={dashboardStyles.taxCreditPanel}>
        <Text style={dashboardStyles.taxCreditTitle}>45L Tax Credit Potential</Text>
        <View style={dashboardStyles.taxCreditRow}>
          <Text style={dashboardStyles.taxCreditLabel}>Eligible Homes:</Text>
          <Text style={dashboardStyles.taxCreditValue}>{summary.tax45LEligibleCount}</Text>
        </View>
        <View style={dashboardStyles.taxCreditRow}>
          <Text style={dashboardStyles.taxCreditLabel}>Credit per Home:</Text>
          <Text style={dashboardStyles.taxCreditValue}>
            ${creditsPerHome.toLocaleString()}
          </Text>
        </View>
        <View style={dashboardStyles.taxCreditRow}>
          <Text style={dashboardStyles.taxCreditLabel}>Total Potential Credits:</Text>
          <Text style={dashboardStyles.taxCreditValue}>
            ${totalCredits.toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );
}

function DashboardFooter() {
  return (
    <View style={dashboardStyles.footer} fixed>
      <Text>Builder Performance Dashboard Report</Text>
      <Text>Track ACH50 performance, rankings, and tax credits</Text>
    </View>
  );
}

function DashboardReportDocument({ data }: { data: DashboardPDFData }) {
  return (
    <Document>
      <Page size="LETTER" style={dashboardStyles.page}>
        <DashboardHeader />
        <MetricsSection summary={data.summary} />
        <TierDistributionSection summary={data.summary} />
        <HighlightsSection highlights={data.summary.monthlyHighlights} />
        <DashboardFooter />
      </Page>
      
      <Page size="LETTER" style={dashboardStyles.page}>
        <LeaderboardSection leaderboard={data.leaderboard} />
        <TaxCreditSection summary={data.summary} />
        <DashboardFooter />
      </Page>
    </Document>
  );
}

export async function generateDashboardPDF(data: DashboardPDFData): Promise<Buffer> {
  try {
    const pdfDocument = <DashboardReportDocument data={data} />;
    const buffer = await renderToBuffer(pdfDocument);
    return buffer;
  } catch (error) {
    serverLogger.error('Error generating dashboard PDF:', error);
    throw new Error(`Dashboard PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
