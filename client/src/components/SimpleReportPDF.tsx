import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { ReportTemplate, Job } from '@shared/schema';

const styles = StyleSheet.create({
  page: { 
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: { 
    fontSize: 20, 
    marginBottom: 20, 
    fontWeight: 'bold',
    color: '#2E5BBA',
    borderBottom: '2pt solid #2E5BBA',
    paddingBottom: 10,
  },
  section: { 
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#212529',
  },
  row: { 
    flexDirection: 'row', 
    marginBottom: 6,
    paddingLeft: 10,
  },
  label: { 
    width: '40%', 
    fontSize: 10, 
    color: '#6C757D',
    fontWeight: 'bold',
  },
  value: { 
    width: '60%', 
    fontSize: 10,
    color: '#212529',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#6C757D',
    textAlign: 'center',
    borderTop: '1pt solid #DEE2E6',
    paddingTop: 10,
  },
  testResultsSection: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#E7F3FF',
    borderRadius: 4,
  },
  passIndicator: {
    color: '#28A745',
    fontWeight: 'bold',
  },
  failIndicator: {
    color: '#DC3545',
    fontWeight: 'bold',
  },
});

interface SimpleReportPDFProps {
  template: ReportTemplate;
  data: {
    address: string;
    builderName: string;
    developmentName: string;
    planName: string;
    lotNumber: string;
    floorArea: number;
    volume: number;
    surfaceArea: number;
    stories: number;
    inspectorName: string;
    scheduledDate: string;
    completedDate: string;
    inspectionType: string;
    status: string;
    blowerDoorResults?: {
      cfm50: number;
      ach50: number;
      testStandard: string;
      passedCompliance: boolean;
    } | null;
    ductLeakageResults?: {
      totalLeakage: number;
      leakageToOutside: number;
      testStandard: string;
      passedCompliance: boolean;
    } | null;
  };
  job: Job;
}

export function SimpleReportPDF({ template, data, job }: SimpleReportPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <Text style={styles.header}>{template.name || 'Inspection Report'}</Text>
        
        {/* Job Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{data.address}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Builder:</Text>
            <Text style={styles.value}>{data.builderName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Development:</Text>
            <Text style={styles.value}>{data.developmentName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Plan:</Text>
            <Text style={styles.value}>{data.planName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Lot Number:</Text>
            <Text style={styles.value}>{data.lotNumber}</Text>
          </View>
        </View>

        {/* Building Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Building Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Floor Area:</Text>
            <Text style={styles.value}>{data.floorArea} sq ft</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Volume:</Text>
            <Text style={styles.value}>{data.volume} cu ft</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Surface Area:</Text>
            <Text style={styles.value}>{data.surfaceArea} sq ft</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Stories:</Text>
            <Text style={styles.value}>{data.stories}</Text>
          </View>
        </View>

        {/* Inspection Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inspection Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Inspection Type:</Text>
            <Text style={styles.value}>{data.inspectionType}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Inspector:</Text>
            <Text style={styles.value}>{data.inspectorName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Scheduled Date:</Text>
            <Text style={styles.value}>{data.scheduledDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Completed Date:</Text>
            <Text style={styles.value}>{data.completedDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{data.status}</Text>
          </View>
        </View>

        {/* Blower Door Test Results (if available) */}
        {data.blowerDoorResults && (
          <View style={styles.testResultsSection}>
            <Text style={styles.sectionTitle}>Blower Door Test Results</Text>
            <View style={styles.row}>
              <Text style={styles.label}>CFM50:</Text>
              <Text style={styles.value}>{data.blowerDoorResults.cfm50}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>ACH50:</Text>
              <Text style={styles.value}>{data.blowerDoorResults.ach50}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Test Standard:</Text>
              <Text style={styles.value}>{data.blowerDoorResults.testStandard}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Compliance:</Text>
              <Text style={data.blowerDoorResults.passedCompliance ? styles.passIndicator : styles.failIndicator}>
                {data.blowerDoorResults.passedCompliance ? 'PASSED' : 'FAILED'}
              </Text>
            </View>
          </View>
        )}

        {/* Duct Leakage Test Results (if available) */}
        {data.ductLeakageResults && (
          <View style={styles.testResultsSection}>
            <Text style={styles.sectionTitle}>Duct Leakage Test Results</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Total Leakage:</Text>
              <Text style={styles.value}>{data.ductLeakageResults.totalLeakage} CFM</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Leakage to Outside:</Text>
              <Text style={styles.value}>{data.ductLeakageResults.leakageToOutside} CFM</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Test Standard:</Text>
              <Text style={styles.value}>{data.ductLeakageResults.testStandard}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Compliance:</Text>
              <Text style={data.ductLeakageResults.passedCompliance ? styles.passIndicator : styles.failIndicator}>
                {data.ductLeakageResults.passedCompliance ? 'PASSED' : 'FAILED'}
              </Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Generated on {new Date().toLocaleString()} | Job ID: {job.id}
        </Text>
      </Page>
    </Document>
  );
}
