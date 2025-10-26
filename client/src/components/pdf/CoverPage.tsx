import { Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { colors, formatDate } from './styles';
import type { Job, Builder, User } from '@shared/schema';

interface CoverPageProps {
  reportTitle: string;
  reportType: string;
  job?: Job;
  builder?: Builder;
  inspector?: User;
  reportId: string;
  createdAt: Date;
  logoUrl?: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: colors.white,
    fontFamily: 'Open Sans',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
    paddingTop: 40,
  },
  logo: {
    width: 150,
    height: 60,
  },
  placeholderLogo: {
    width: 150,
    height: 60,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  placeholderLogoText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 700,
    fontFamily: 'Roboto',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 50,
  },
  reportType: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 8,
    fontFamily: 'Roboto',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 20,
    fontFamily: 'Roboto',
    textAlign: 'center',
  },
  divider: {
    width: 100,
    height: 3,
    backgroundColor: colors.primary,
    marginTop: 20,
  },
  infoSection: {
    marginTop: 60,
    backgroundColor: colors.background,
    padding: 30,
    borderRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  infoLabel: {
    width: 140,
    fontSize: 11,
    color: colors.textLight,
    fontWeight: 600,
    fontFamily: 'Roboto',
  },
  infoValue: {
    flex: 1,
    fontSize: 11,
    color: colors.text,
    fontFamily: 'Open Sans',
  },
  propertyAddress: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.text,
    marginBottom: 20,
    paddingBottom: 12,
    borderBottom: `1pt solid ${colors.border}`,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
  },
  reportNumber: {
    fontSize: 10,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 8,
  },
  generatedDate: {
    fontSize: 9,
    color: colors.textLight,
    textAlign: 'center',
  },
});

export function CoverPage({
  reportTitle,
  reportType,
  job,
  builder,
  inspector,
  reportId,
  createdAt,
  logoUrl
}: CoverPageProps) {
  const address = job ? `${job.address}, ${job.city}, ${job.state} ${job.zip}` : 'Property Address Not Available';
  
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.logoContainer}>
        {logoUrl ? (
          <Image style={styles.logo} src={logoUrl} />
        ) : (
          <View style={styles.placeholderLogo}>
            <Text style={styles.placeholderLogoText}>ENERGY AUDIT</Text>
          </View>
        )}
      </View>

      <View style={styles.titleSection}>
        <Text style={styles.reportType}>{reportType}</Text>
        <Text style={styles.title}>{reportTitle}</Text>
        <View style={styles.divider} />
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.propertyAddress}>{address}</Text>
        
        {job && (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Job Number:</Text>
              <Text style={styles.infoValue}>{job.name || job.id}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Inspection Date:</Text>
              <Text style={styles.infoValue}>{job.inspectionDate ? formatDate(job.inspectionDate) : 'TBD'}</Text>
            </View>
          </>
        )}

        {builder && (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Builder:</Text>
              <Text style={styles.infoValue}>{builder.companyName}</Text>
            </View>
            
            {builder.name && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Contact:</Text>
                <Text style={styles.infoValue}>{builder.name}</Text>
              </View>
            )}
          </>
        )}

        {inspector && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Inspector:</Text>
            <Text style={styles.infoValue}>
              {inspector.firstName} {inspector.lastName}
            </Text>
          </View>
        )}

        {job?.lot && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Lot:</Text>
            <Text style={styles.infoValue}>{job.lot}</Text>
          </View>
        )}

        {job?.planName && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Plan:</Text>
            <Text style={styles.infoValue}>{job.planName}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.reportNumber}>Report ID: {reportId}</Text>
        <Text style={styles.generatedDate}>Generated on {formatDate(createdAt)}</Text>
      </View>
    </Page>
  );
}