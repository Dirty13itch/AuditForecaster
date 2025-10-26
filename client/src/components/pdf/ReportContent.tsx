import { Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { colors, formatDate, formatTime, commonStyles } from './styles';
import type { TemplateField, ReportFieldValue } from '@shared/schema';

interface ReportContentProps {
  sections: Array<{
    id: string;
    name: string;
    fields: Array<{
      field: TemplateField;
      value?: ReportFieldValue;
    }>;
  }>;
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 12,
    fontFamily: 'Roboto',
    borderBottom: `1pt solid ${colors.border}`,
    paddingBottom: 4,
  },
  fieldContainer: {
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: colors.textLight,
    marginBottom: 3,
    fontFamily: 'Roboto',
    minWidth: 120,
  },
  fieldValue: {
    fontSize: 11,
    color: colors.text,
    flex: 1,
    lineHeight: 1.4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 10,
    color: colors.success,
    fontWeight: 700,
  },
  multiSelectItem: {
    fontSize: 11,
    color: colors.text,
    marginLeft: 20,
    marginBottom: 2,
  },
  scaleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  scaleStar: {
    fontSize: 14,
    marginRight: 3,
  },
  calculationResult: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.primary,
    marginTop: 3,
  },
  calculationFormula: {
    fontSize: 9,
    color: colors.textLight,
    marginTop: 2,
    fontStyle: 'italic',
  },
  photo: {
    width: 200,
    height: 150,
    marginTop: 5,
    marginBottom: 3,
    objectFit: 'cover',
  },
  photoCaption: {
    fontSize: 9,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  signature: {
    width: 150,
    height: 50,
    marginTop: 5,
    objectFit: 'contain',
  },
  yesNoIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    marginLeft: 8,
  },
  yesIndicator: {
    backgroundColor: colors.success,
  },
  noIndicator: {
    backgroundColor: colors.danger,
  },
  naIndicator: {
    backgroundColor: colors.textLight,
  },
  yesNoText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 600,
  },
  textArea: {
    fontSize: 11,
    color: colors.text,
    lineHeight: 1.5,
    marginTop: 3,
    paddingLeft: 10,
    borderLeft: `2pt solid ${colors.border}`,
  },
  emptyValue: {
    fontSize: 10,
    color: colors.textLight,
    fontStyle: 'italic',
  },
});

function renderFieldValue(field: TemplateField, value?: ReportFieldValue) {
  if (!value || !value.value) {
    return <Text style={styles.emptyValue}>No data provided</Text>;
  }

  const val = typeof value.value === 'string' ? value.value : JSON.stringify(value.value);

  switch (field.type) {
    case 'text':
      return <Text style={styles.fieldValue}>{val}</Text>;

    case 'textarea':
      return <Text style={styles.textArea}>{val}</Text>;

    case 'number':
      const unit = field.validation?.unit || '';
      return <Text style={styles.fieldValue}>{val} {unit}</Text>;

    case 'checkbox':
      const isChecked = val === 'true' || val === '1';
      return (
        <View style={styles.checkboxContainer}>
          <View style={styles.checkbox}>
            {isChecked && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.fieldValue}>{field.label}</Text>
        </View>
      );

    case 'select':
      return <Text style={styles.fieldValue}>{val}</Text>;

    case 'multiselect':
      try {
        const items = JSON.parse(val);
        if (Array.isArray(items)) {
          return (
            <View>
              {items.map((item, idx) => (
                <Text key={idx} style={styles.multiSelectItem}>• {item}</Text>
              ))}
            </View>
          );
        }
      } catch {
        return <Text style={styles.fieldValue}>{val}</Text>;
      }
      break;

    case 'yes_no_na':
      const yesNoValue = val.toLowerCase();
      const getIndicatorStyle = () => {
        if (yesNoValue === 'yes') return [styles.yesNoIndicator, styles.yesIndicator];
        if (yesNoValue === 'no') return [styles.yesNoIndicator, styles.noIndicator];
        return [styles.yesNoIndicator, styles.naIndicator];
      };
      return (
        <View style={styles.checkboxContainer}>
          <View style={getIndicatorStyle()}>
            <Text style={styles.yesNoText}>{val.toUpperCase()}</Text>
          </View>
        </View>
      );

    case 'scale':
      const scaleValue = parseInt(val);
      const maxScale = field.validation?.max || 5;
      return (
        <View style={styles.scaleContainer}>
          {Array.from({ length: maxScale }).map((_, i) => (
            <Text key={i} style={[styles.scaleStar, { color: i < scaleValue ? colors.warning : colors.border }]}>
              ★
            </Text>
          ))}
          <Text style={styles.fieldValue}> ({scaleValue}/{maxScale})</Text>
        </View>
      );

    case 'date':
      try {
        return <Text style={styles.fieldValue}>{formatDate(val)}</Text>;
      } catch {
        return <Text style={styles.fieldValue}>{val}</Text>;
      }

    case 'time':
      return <Text style={styles.fieldValue}>{formatTime(val)}</Text>;

    case 'datetime':
      try {
        const dt = new Date(val);
        return <Text style={styles.fieldValue}>{formatDate(dt)} at {formatTime(dt.toTimeString())}</Text>;
      } catch {
        return <Text style={styles.fieldValue}>{val}</Text>;
      }

    case 'photo':
      try {
        const photoData = JSON.parse(val);
        return (
          <View>
            <Image style={styles.photo} src={photoData.url || val} />
            {photoData.caption && <Text style={styles.photoCaption}>{photoData.caption}</Text>}
          </View>
        );
      } catch {
        if (val.startsWith('http') || val.startsWith('data:')) {
          return <Image style={styles.photo} src={val} />;
        }
        return <Text style={styles.emptyValue}>Photo not available</Text>;
      }

    case 'signature':
      if (val.startsWith('http') || val.startsWith('data:')) {
        return <Image style={styles.signature} src={val} />;
      }
      return <Text style={styles.emptyValue}>Signature not available</Text>;

    case 'calculation':
      try {
        const calcData = JSON.parse(val);
        return (
          <View>
            <Text style={styles.calculationResult}>Result: {calcData.result || val}</Text>
            {calcData.formula && (
              <Text style={styles.calculationFormula}>Formula: {calcData.formula}</Text>
            )}
          </View>
        );
      } catch {
        return <Text style={styles.calculationResult}>{val}</Text>;
      }

    default:
      return <Text style={styles.fieldValue}>{val}</Text>;
  }
}

export function ReportContent({ sections }: ReportContentProps) {
  return (
    <View>
      {sections.map(section => (
        <View key={section.id} style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>{section.name}</Text>
          {section.fields.map(({ field, value }) => (
            <View key={field.id} style={styles.fieldContainer}>
              {field.type !== 'checkbox' && (
                <Text style={styles.fieldLabel}>{field.label}:</Text>
              )}
              {renderFieldValue(field, value)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}