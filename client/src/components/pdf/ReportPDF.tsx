import { Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer';
import { CoverPage } from './CoverPage';
import { TableOfContents, type TocItem } from './TableOfContents';
import { ReportContent } from './ReportContent';
import { TestResults } from './TestResults';
import { PhotoGrid } from './PhotoGrid';
import { colors, commonStyles } from './styles';
import type { 
  ReportInstance, 
  ReportTemplate,
  TemplateSection,
  TemplateField,
  ReportFieldValue,
  Job, 
  Builder, 
  User, 
  Photo,
  BlowerDoorTest,
  DuctLeakageTest,
  ChecklistItem
} from '@shared/schema';

interface ReportPDFProps {
  reportInstance?: ReportInstance;
  reportTemplate?: ReportTemplate;
  sections?: TemplateSection[];
  fields?: TemplateField[];
  fieldValues?: ReportFieldValue[];
  job?: Job;
  builder?: Builder;
  inspector?: User;
  photos?: Photo[];
  blowerDoorTest?: BlowerDoorTest;
  ductLeakageTest?: DuctLeakageTest;
  checklistItems?: ChecklistItem[];
  logoUrl?: string;
}

const styles = StyleSheet.create({
  document: {
    width: '100%',
    height: '100%',
  },
  page: {
    ...commonStyles.page,
  },
  pageWithHeader: {
    ...commonStyles.page,
    paddingTop: 80,
  },
  checklistSection: {
    marginBottom: 30,
  },
  checklistTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 15,
    fontFamily: 'Roboto',
    borderBottom: `2pt solid ${colors.primary}`,
    paddingBottom: 6,
  },
  checklistCategory: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.text,
    marginTop: 15,
    marginBottom: 8,
    fontFamily: 'Roboto',
    borderLeft: `3pt solid ${colors.primary}`,
    paddingLeft: 8,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 15,
  },
  checklistCheckbox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checklistCheckmark: {
    fontSize: 8,
    fontWeight: 700,
  },
  checklistText: {
    fontSize: 10,
    color: colors.text,
    flex: 1,
    lineHeight: 1.4,
  },
  checklistNotes: {
    fontSize: 9,
    color: colors.textLight,
    marginLeft: 20,
    marginTop: 2,
    fontStyle: 'italic',
  },
  scoreSection: {
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 4,
    marginBottom: 20,
  },
  scoreTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.text,
    marginBottom: 10,
    fontFamily: 'Roboto',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  scoreLabel: {
    fontSize: 11,
    color: colors.textLight,
  },
  scoreValue: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.text,
  },
  scoreBadge: {
    fontSize: 20,
    fontWeight: 700,
    fontFamily: 'Roboto',
    textAlign: 'center',
    marginTop: 10,
  },
});

function getChecklistCategories(items: ChecklistItem[]): { [category: string]: ChecklistItem[] } {
  return items.reduce((acc, item) => {
    const category = item.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as { [category: string]: ChecklistItem[] });
}

function calculateScore(items: ChecklistItem[]): { 
  total: number; 
  completed: number; 
  percentage: number;
  grade: string;
} {
  const total = items.length;
  const completed = items.filter(item => item.status === 'completed' || item.status === 'pass').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  let grade = 'F';
  if (percentage >= 90) grade = 'A';
  else if (percentage >= 80) grade = 'B';
  else if (percentage >= 70) grade = 'C';
  else if (percentage >= 60) grade = 'D';
  
  return { total, completed, percentage, grade };
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return colors.success;
    case 'B': return colors.info;
    case 'C': return colors.warning;
    case 'D': case 'F': return colors.danger;
    default: return colors.text;
  }
}

export function ReportPDF({
  reportInstance,
  reportTemplate,
  sections = [],
  fields = [],
  fieldValues = [],
  job,
  builder,
  inspector,
  photos = [],
  blowerDoorTest,
  ductLeakageTest,
  checklistItems = [],
  logoUrl
}: ReportPDFProps) {
  // Build table of contents
  const tocItems: TocItem[] = [];
  let currentPage = 3; // Start after cover and TOC
  
  if (checklistItems.length > 0) {
    tocItems.push({ title: 'Inspection Checklist', page: currentPage, level: 1 });
    currentPage += Math.ceil(checklistItems.length / 20); // Estimate pages
  }
  
  if (sections.length > 0 || reportInstance) {
    tocItems.push({ title: 'Report Details', page: currentPage, level: 1 });
    sections.forEach(section => {
      tocItems.push({ title: section.name, page: currentPage, level: 2 });
      currentPage++;
    });
  }
  
  if (blowerDoorTest) {
    tocItems.push({ title: 'Blower Door Test Results', page: currentPage, level: 1 });
    currentPage += 2;
  }
  
  if (ductLeakageTest) {
    tocItems.push({ title: 'Duct Leakage Test Results', page: currentPage, level: 1 });
    currentPage += 2;
  }
  
  if (photos.length > 0) {
    tocItems.push({ title: 'Photos & Documentation', page: currentPage, level: 1 });
    currentPage += Math.ceil(photos.length / 6); // Estimate pages
  }

  // Prepare report sections with field values
  const reportSections = sections.map(section => {
    const sectionFields = fields
      .filter(field => field.sectionId === section.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(field => ({
        field,
        value: fieldValues.find(v => v.fieldId === field.id)
      }));
    
    return {
      id: section.id,
      name: section.name,
      fields: sectionFields
    };
  });

  // Report metadata
  const reportTitle = reportTemplate?.name || reportInstance?.templateName || 'Energy Audit Report';
  const reportType = reportTemplate?.type || 'INSPECTION REPORT';
  const reportId = reportInstance?.id || `DRAFT-${Date.now()}`;
  const createdAt = reportInstance?.createdAt ? new Date(reportInstance.createdAt) : new Date();

  return (
    <Document>
      {/* Cover Page */}
      <CoverPage
        reportTitle={reportTitle}
        reportType={reportType}
        job={job}
        builder={builder}
        inspector={inspector}
        reportId={reportId}
        createdAt={createdAt}
        logoUrl={logoUrl}
      />

      {/* Table of Contents */}
      <Page size="A4" style={styles.page}>
        <TableOfContents items={tocItems} />
      </Page>

      {/* Inspection Checklist */}
      {checklistItems.length > 0 && (
        <Page size="A4" style={styles.pageWithHeader}>
          <View style={commonStyles.header}>
            <Text style={commonStyles.headerText}>Energy Audit Report</Text>
            <Text style={commonStyles.headerText}>Page 3</Text>
          </View>
          
          <View style={styles.checklistSection}>
            <Text style={styles.checklistTitle}>Inspection Checklist</Text>
            
            {/* Score Summary */}
            {(() => {
              const score = calculateScore(checklistItems);
              return (
                <View style={styles.scoreSection}>
                  <Text style={styles.scoreTitle}>Overall Score</Text>
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreLabel}>Items Completed:</Text>
                    <Text style={styles.scoreValue}>{score.completed} of {score.total}</Text>
                  </View>
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreLabel}>Completion Rate:</Text>
                    <Text style={styles.scoreValue}>{score.percentage}%</Text>
                  </View>
                  <Text style={[styles.scoreBadge, { color: getGradeColor(score.grade) }]}>
                    Grade: {score.grade}
                  </Text>
                </View>
              );
            })()}
            
            {/* Checklist Items by Category */}
            {Object.entries(getChecklistCategories(checklistItems)).map(([category, items]) => (
              <View key={category} wrap={false}>
                <Text style={styles.checklistCategory}>{category}</Text>
                {items.map(item => (
                  <View key={item.id} style={styles.checklistItem}>
                    <View style={styles.checklistCheckbox}>
                      <Text style={[
                        styles.checklistCheckmark,
                        { color: item.status === 'pass' ? colors.success : 
                                 item.status === 'fail' ? colors.danger : 
                                 item.status === 'completed' ? colors.text : colors.border }
                      ]}>
                        {item.status === 'pass' || item.status === 'completed' ? '✓' : 
                         item.status === 'fail' ? '✗' : ''}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.checklistText}>
                        {item.itemNumber}. {item.description}
                      </Text>
                      {item.notes && (
                        <Text style={styles.checklistNotes}>{item.notes}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
          
          <View style={commonStyles.footer}>
            <Text style={commonStyles.footerText}>© 2025 Energy Audit Services</Text>
            <Text style={commonStyles.footerText}>Confidential Report</Text>
          </View>
        </Page>
      )}

      {/* Report Content */}
      {reportSections.length > 0 && (
        <Page size="A4" style={styles.pageWithHeader}>
          <View style={commonStyles.header}>
            <Text style={commonStyles.headerText}>Energy Audit Report</Text>
            <Text style={commonStyles.headerText}>Page {tocItems.find(t => t.title === 'Report Details')?.page || 4}</Text>
          </View>
          
          <ReportContent sections={reportSections} />
          
          <View style={commonStyles.footer}>
            <Text style={commonStyles.footerText}>© 2025 Energy Audit Services</Text>
            <Text style={commonStyles.footerText}>Confidential Report</Text>
          </View>
        </Page>
      )}

      {/* Test Results */}
      {(blowerDoorTest || ductLeakageTest) && (
        <Page size="A4" style={styles.pageWithHeader}>
          <View style={commonStyles.header}>
            <Text style={commonStyles.headerText}>Energy Audit Report</Text>
            <Text style={commonStyles.headerText}>Test Results</Text>
          </View>
          
          <TestResults 
            blowerDoorTest={blowerDoorTest}
            ductLeakageTest={ductLeakageTest}
          />
          
          <View style={commonStyles.footer}>
            <Text style={commonStyles.footerText}>© 2025 Energy Audit Services</Text>
            <Text style={commonStyles.footerText}>Confidential Report</Text>
          </View>
        </Page>
      )}

      {/* Photos Section */}
      {photos.length > 0 && (
        <Page size="A4" style={styles.pageWithHeader}>
          <View style={commonStyles.header}>
            <Text style={commonStyles.headerText}>Energy Audit Report</Text>
            <Text style={commonStyles.headerText}>Photos & Documentation</Text>
          </View>
          
          <PhotoGrid 
            photos={photos}
            title="Photos & Documentation"
            columns={2}
          />
          
          <View style={commonStyles.footer}>
            <Text style={commonStyles.footerText}>© 2025 Energy Audit Services</Text>
            <Text style={commonStyles.footerText}>Confidential Report</Text>
          </View>
        </Page>
      )}
    </Document>
  );
}

// Component for previewing PDF in browser (development/testing)
export function ReportPDFViewer(props: ReportPDFProps) {
  return (
    <PDFViewer style={styles.document}>
      <ReportPDF {...props} />
    </PDFViewer>
  );
}