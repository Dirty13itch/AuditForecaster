import { StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts for professional appearance
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf' },
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmEU9vAA.ttf', fontWeight: 500 },
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAA.ttf', fontWeight: 700 },
  ]
});

Font.register({
  family: 'Open Sans',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/opensans/v35/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVc.ttf' },
    { src: 'https://fonts.gstatic.com/s/opensans/v35/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsg-1x4gaVc.ttf', fontWeight: 600 },
  ]
});

// Color palette matching the application design
export const colors = {
  primary: '#2E5BBA',
  secondary: '#28A745',
  warning: '#FFC107',
  error: '#DC3545',
  text: '#212529',
  textLight: '#6C757D',
  border: '#DEE2E6',
  background: '#F8F9FA',
  white: '#FFFFFF',
  success: '#28A745',
  danger: '#DC3545',
  info: '#17A2B8',
};

// Common PDF styles
export const commonStyles = StyleSheet.create({
  page: {
    fontFamily: 'Open Sans',
    fontSize: 11,
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 40,
    backgroundColor: colors.white,
  },
  header: {
    position: 'absolute',
    top: 20,
    left: 40,
    right: 40,
    height: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: `1pt solid ${colors.border}`,
    paddingBottom: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    height: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: `1pt solid ${colors.border}`,
    paddingTop: 5,
  },
  headerText: {
    fontSize: 9,
    color: colors.textLight,
    fontFamily: 'Roboto',
  },
  footerText: {
    fontSize: 8,
    color: colors.textLight,
    fontFamily: 'Open Sans',
  },
  h1: {
    fontSize: 24,
    marginBottom: 16,
    fontWeight: 700,
    fontFamily: 'Roboto',
    color: colors.text,
  },
  h2: {
    fontSize: 18,
    marginBottom: 12,
    fontWeight: 600,
    fontFamily: 'Roboto',
    color: colors.text,
  },
  h3: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: 600,
    fontFamily: 'Roboto',
    color: colors.text,
  },
  paragraph: {
    marginBottom: 8,
    lineHeight: 1.5,
    color: colors.text,
  },
  label: {
    fontSize: 10,
    fontWeight: 600,
    color: colors.textLight,
    marginBottom: 2,
    fontFamily: 'Roboto',
  },
  value: {
    fontSize: 11,
    color: colors.text,
    marginBottom: 8,
  },
  section: {
    marginBottom: 20,
  },
  table: {
    display: 'table' as any,
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: colors.border,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCol: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
  },
  tableHeader: {
    backgroundColor: colors.background,
    fontWeight: 600,
    fontFamily: 'Roboto',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 600,
    fontFamily: 'Roboto',
  },
  badgeSuccess: {
    backgroundColor: colors.success,
    color: colors.white,
  },
  badgeDanger: {
    backgroundColor: colors.danger,
    color: colors.white,
  },
  badgeWarning: {
    backgroundColor: colors.warning,
    color: colors.text,
  },
  badgeInfo: {
    backgroundColor: colors.info,
    color: colors.white,
  },
  pageBreak: {
    marginBottom: 0,
    pageBreakAfter: 'always' as any,
  },
});

// Utility function to format dates
export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

// Utility function to format times
export const formatTime = (time: string): string => {
  try {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch {
    return time;
  }
};