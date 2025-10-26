import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { colors, formatDate, formatTime } from './styles';
import type { BlowerDoorTest, DuctLeakageTest } from '@shared/schema';

interface TestResultsProps {
  blowerDoorTest?: BlowerDoorTest;
  ductLeakageTest?: DuctLeakageTest;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: colors.white,
    fontFamily: 'Open Sans',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 20,
    fontFamily: 'Roboto',
    borderBottom: `2pt solid ${colors.primary}`,
    paddingBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
    fontFamily: 'Roboto',
  },
  resultBox: {
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 4,
    marginBottom: 15,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: 600,
    fontFamily: 'Roboto',
  },
  resultValue: {
    fontSize: 11,
    color: colors.text,
  },
  bigNumber: {
    fontSize: 24,
    fontWeight: 700,
    color: colors.primary,
    fontFamily: 'Roboto',
  },
  unitLabel: {
    fontSize: 10,
    color: colors.textLight,
    marginLeft: 4,
  },
  passFailBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  passBadge: {
    backgroundColor: colors.success,
  },
  failBadge: {
    backgroundColor: colors.danger,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'Roboto',
  },
  table: {
    marginTop: 10,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableHeaderText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 600,
    fontFamily: 'Roboto',
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: `1pt solid ${colors.border}`,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  tableRowAlternate: {
    backgroundColor: colors.background,
  },
  tableCell: {
    fontSize: 10,
    color: colors.text,
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  gridItem: {
    width: '30%',
    marginRight: '3%',
    marginBottom: 10,
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 3,
  },
  gridLabel: {
    fontSize: 9,
    color: colors.textLight,
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.text,
  },
  weatherBox: {
    marginTop: 15,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 4,
  },
  weatherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weatherLabel: {
    fontSize: 10,
    color: colors.textLight,
  },
  weatherValue: {
    fontSize: 10,
    color: colors.text,
  },
  complianceSection: {
    marginTop: 20,
    padding: 15,
    borderWidth: 2,
    borderRadius: 4,
  },
  compliancePass: {
    borderColor: colors.success,
    backgroundColor: `${colors.success}10`,
  },
  complianceFail: {
    borderColor: colors.danger,
    backgroundColor: `${colors.danger}10`,
  },
  complianceTitle: {
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'Roboto',
    marginBottom: 8,
  },
  complianceDetail: {
    fontSize: 10,
    color: colors.text,
    lineHeight: 1.4,
  },
});

function BlowerDoorTestResults({ test }: { test: BlowerDoorTest }) {
  const meetsCode = test.meetsCode || false;
  const margin = test.margin || 0;
  
  return (
    <View>
      <Text style={styles.title}>Blower Door Test Results</Text>
      
      <View style={styles.resultBox}>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Test Date:</Text>
          <Text style={styles.resultValue}>
            {formatDate(test.testDate)} at {formatTime(test.testTime)}
          </Text>
        </View>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Equipment Serial:</Text>
          <Text style={styles.resultValue}>{test.equipmentSerial || 'N/A'}</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>Primary Results</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.bigNumber}>
            {test.cfm50?.toFixed(0) || '0'}
            <Text style={styles.unitLabel}>CFM50</Text>
          </Text>
          <Text style={styles.resultLabel}>Air Flow at 50 Pa</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.bigNumber}>
            {test.ach50?.toFixed(2) || '0.00'}
            <Text style={styles.unitLabel}>ACH50</Text>
          </Text>
          <Text style={styles.resultLabel}>Air Changes per Hour</Text>
        </View>
      </View>

      <View style={[styles.complianceSection, meetsCode ? styles.compliancePass : styles.complianceFail]}>
        <Text style={[styles.complianceTitle, { color: meetsCode ? colors.success : colors.danger }]}>
          Minnesota 2020 Energy Code Compliance
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={styles.complianceDetail}>Code Limit: {test.codeLimit} ACH50</Text>
          <Text style={styles.complianceDetail}>Result: {test.ach50?.toFixed(2)} ACH50</Text>
        </View>
        <View style={[styles.passFailBadge, meetsCode ? styles.passBadge : styles.failBadge]}>
          <Text style={styles.badgeText}>{meetsCode ? 'PASS' : 'FAIL'}</Text>
        </View>
        <Text style={styles.complianceDetail}>
          Margin: {Math.abs(margin).toFixed(1)}% {margin >= 0 ? 'below' : 'above'} limit
        </Text>
      </View>

      {test.testPoints && test.testPoints.length > 0 && (
        <>
          <Text style={styles.subtitle}>Multi-Point Test Data</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>House Pressure</Text>
              <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>Fan Pressure</Text>
              <Text style={styles.tableHeaderText}>CFM</Text>
              <Text style={styles.tableHeaderText}>Ring Config</Text>
            </View>
            {test.testPoints.map((point: any, index: number) => (
              <View key={index} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>{point.housePressure} Pa</Text>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>{point.fanPressure.toFixed(1)} Pa</Text>
                <Text style={styles.tableCell}>{point.cfm.toFixed(0)}</Text>
                <Text style={styles.tableCell}>{point.ringConfiguration}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={styles.subtitle}>Building Characteristics</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>House Volume</Text>
          <Text style={styles.gridValue}>{test.houseVolume?.toLocaleString()} ft³</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Conditioned Area</Text>
          <Text style={styles.gridValue}>{test.conditionedArea?.toLocaleString()} ft²</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Surface Area</Text>
          <Text style={styles.gridValue}>{test.surfaceArea?.toLocaleString()} ft²</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Stories</Text>
          <Text style={styles.gridValue}>{test.numberOfStories}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Basement</Text>
          <Text style={styles.gridValue}>{test.basementType}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>ELA</Text>
          <Text style={styles.gridValue}>{test.ela?.toFixed(1)} in²</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>Weather Conditions</Text>
      <View style={styles.weatherBox}>
        <View style={styles.weatherRow}>
          <Text style={styles.weatherLabel}>Outdoor Temp:</Text>
          <Text style={styles.weatherValue}>{test.outdoorTemp}°F</Text>
        </View>
        <View style={styles.weatherRow}>
          <Text style={styles.weatherLabel}>Indoor Temp:</Text>
          <Text style={styles.weatherValue}>{test.indoorTemp}°F</Text>
        </View>
        <View style={styles.weatherRow}>
          <Text style={styles.weatherLabel}>Wind Speed:</Text>
          <Text style={styles.weatherValue}>{test.windSpeed} mph</Text>
        </View>
        <View style={styles.weatherRow}>
          <Text style={styles.weatherLabel}>Barometric Pressure:</Text>
          <Text style={styles.weatherValue}>{test.barometricPressure} inHg</Text>
        </View>
        <View style={styles.weatherRow}>
          <Text style={styles.weatherLabel}>Altitude:</Text>
          <Text style={styles.weatherValue}>{test.altitude} ft</Text>
        </View>
      </View>
    </View>
  );
}

function DuctLeakageTestResults({ test }: { test: DuctLeakageTest }) {
  const meetsCodeTDL = test.meetsCodeTDL || false;
  const meetsCodeDLO = test.meetsCodeDLO || false;
  
  return (
    <View>
      <Text style={styles.title}>Duct Leakage Test Results</Text>
      
      <View style={styles.resultBox}>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Test Date:</Text>
          <Text style={styles.resultValue}>
            {formatDate(test.testDate)} at {formatTime(test.testTime)}
          </Text>
        </View>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>System Type:</Text>
          <Text style={styles.resultValue}>{test.systemType?.replace('_', ' ').toUpperCase()}</Text>
        </View>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Conditioned Area:</Text>
          <Text style={styles.resultValue}>{test.conditionedArea?.toLocaleString()} ft²</Text>
        </View>
      </View>

      {test.testType === 'both' || test.testType === 'total' ? (
        <>
          <Text style={styles.subtitle}>Total Duct Leakage (TDL)</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.bigNumber}>
                {test.cfm25Total?.toFixed(0) || '0'}
                <Text style={styles.unitLabel}>CFM25</Text>
              </Text>
              <Text style={styles.resultLabel}>Total Leakage</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.bigNumber}>
                {test.totalCfmPerSqFt?.toFixed(2) || '0.00'}
                <Text style={styles.unitLabel}>CFM/100ft²</Text>
              </Text>
              <Text style={styles.resultLabel}>Leakage Rate</Text>
            </View>
          </View>
          
          <View style={[styles.complianceSection, meetsCodeTDL ? styles.compliancePass : styles.complianceFail]}>
            <Text style={[styles.complianceTitle, { color: meetsCodeTDL ? colors.success : colors.danger }]}>
              TDL Code Compliance
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={styles.complianceDetail}>Code Limit: {test.totalDuctLeakageLimit} CFM/100ft²</Text>
              <Text style={styles.complianceDetail}>Result: {test.totalCfmPerSqFt?.toFixed(2)} CFM/100ft²</Text>
            </View>
            <View style={[styles.passFailBadge, meetsCodeTDL ? styles.passBadge : styles.failBadge]}>
              <Text style={styles.badgeText}>{meetsCodeTDL ? 'PASS' : 'FAIL'}</Text>
            </View>
          </View>
        </>
      ) : null}

      {test.testType === 'both' || test.testType === 'outside' ? (
        <>
          <Text style={styles.subtitle}>Duct Leakage to Outside (DLO)</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.bigNumber}>
                {test.cfm25Outside?.toFixed(0) || '0'}
                <Text style={styles.unitLabel}>CFM25</Text>
              </Text>
              <Text style={styles.resultLabel}>Outside Leakage</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.bigNumber}>
                {test.outsideCfmPerSqFt?.toFixed(2) || '0.00'}
                <Text style={styles.unitLabel}>CFM/100ft²</Text>
              </Text>
              <Text style={styles.resultLabel}>Leakage Rate</Text>
            </View>
          </View>
          
          <View style={[styles.complianceSection, meetsCodeDLO ? styles.compliancePass : styles.complianceFail]}>
            <Text style={[styles.complianceTitle, { color: meetsCodeDLO ? colors.success : colors.danger }]}>
              DLO Code Compliance
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={styles.complianceDetail}>Code Limit: {test.outsideLeakageLimit} CFM/100ft²</Text>
              <Text style={styles.complianceDetail}>Result: {test.outsideCfmPerSqFt?.toFixed(2)} CFM/100ft²</Text>
            </View>
            <View style={[styles.passFailBadge, meetsCodeDLO ? styles.passBadge : styles.failBadge]}>
              <Text style={styles.badgeText}>{meetsCodeDLO ? 'PASS' : 'FAIL'}</Text>
            </View>
          </View>
        </>
      ) : null}

      {test.pressurePanReadings && test.pressurePanReadings.length > 0 && (
        <>
          <Text style={styles.subtitle}>Pressure Pan Readings</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderText}>Location</Text>
              <Text style={styles.tableHeaderText}>Type</Text>
              <Text style={styles.tableHeaderText}>Reading (Pa)</Text>
              <Text style={styles.tableHeaderText}>Status</Text>
            </View>
            {test.pressurePanReadings.map((reading: any, index: number) => (
              <View key={index} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
                <Text style={styles.tableCell}>{reading.location}</Text>
                <Text style={styles.tableCell}>{reading.supplyReturn?.toUpperCase()}</Text>
                <Text style={styles.tableCell}>{reading.reading} Pa</Text>
                <Text style={[styles.tableCell, { 
                  color: reading.passFail === 'pass' ? colors.success : 
                         reading.passFail === 'fail' ? colors.danger : colors.warning 
                }]}>
                  {reading.passFail?.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {test.notes && (
        <>
          <Text style={styles.subtitle}>Notes</Text>
          <Text style={{ fontSize: 10, color: colors.text, lineHeight: 1.4 }}>{test.notes}</Text>
        </>
      )}
    </View>
  );
}

export function TestResults({ blowerDoorTest, ductLeakageTest }: TestResultsProps) {
  return (
    <View>
      {blowerDoorTest && <BlowerDoorTestResults test={blowerDoorTest} />}
      {blowerDoorTest && ductLeakageTest && <View style={{ marginBottom: 30 }} />}
      {ductLeakageTest && <DuctLeakageTestResults test={ductLeakageTest} />}
    </View>
  );
}