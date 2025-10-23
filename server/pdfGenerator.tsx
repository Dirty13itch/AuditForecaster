import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';
import { renderToBuffer } from '@react-pdf/renderer';
import type { Job, Builder, ChecklistItem, Photo, Forecast, ReportInstance } from '@shared/schema';

interface ReportSection {
  id: string;
  title: string;
  type: "Text" | "Photos" | "Checklist" | "Forecast" | "Signature";
  order: number;
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
});

function ReportHeader({ job, reportData }: { job: Job; reportData: any }) {
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
            {forecast.predictedTDL} <Text style={styles.forecastUnit}>CFM25</Text>
          </Text>
        </View>
        <View style={styles.forecastCard}>
          <Text style={styles.forecastLabel}>Predicted DLO</Text>
          <Text style={styles.forecastValue}>
            {forecast.predictedDLO} <Text style={styles.forecastUnit}>%</Text>
          </Text>
        </View>
      </View>

      {(forecast.actualTDL || forecast.actualDLO) && (
        <>
          <View style={styles.forecastGrid}>
            <View style={styles.forecastCard}>
              <Text style={styles.forecastLabel}>Actual TDL</Text>
              <Text style={styles.forecastValue}>
                {forecast.actualTDL || 'N/A'} {forecast.actualTDL && <Text style={styles.forecastUnit}>CFM25</Text>}
              </Text>
            </View>
            <View style={styles.forecastCard}>
              <Text style={styles.forecastLabel}>Actual DLO</Text>
              <Text style={styles.forecastValue}>
                {forecast.actualDLO || 'N/A'} {forecast.actualDLO && <Text style={styles.forecastUnit}>%</Text>}
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
            {forecast.actualTDL && forecast.predictedTDL && (
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>TDL</Text>
                <Text style={styles.tableCell}>{forecast.predictedTDL} CFM25</Text>
                <Text style={styles.tableCell}>{forecast.actualTDL} CFM25</Text>
                <Text style={styles.tableCell}>
                  {((parseFloat(forecast.actualTDL) - parseFloat(forecast.predictedTDL)) / parseFloat(forecast.predictedTDL) * 100).toFixed(1)}%
                </Text>
              </View>
            )}
            {forecast.actualDLO && forecast.predictedDLO && (
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>DLO</Text>
                <Text style={styles.tableCell}>{forecast.predictedDLO}%</Text>
                <Text style={styles.tableCell}>{forecast.actualDLO}%</Text>
                <Text style={styles.tableCell}>
                  {((parseFloat(forecast.actualDLO) - parseFloat(forecast.predictedDLO)) / parseFloat(forecast.predictedDLO) * 100).toFixed(1)}%
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

function ReportFooter({ reportData, pageNumber, totalPages }: { reportData: any; pageNumber: number; totalPages: number }) {
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
          <InspectionSummarySection job={data.job} checklistItems={data.checklistItems} />
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
  try {
    const pdfDocument = <InspectionReportDocument data={data} />;
    const buffer = await renderToBuffer(pdfDocument);
    return buffer;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
