import { Text, View, Link, StyleSheet } from '@react-pdf/renderer';
import { colors } from './styles';

export interface TocItem {
  title: string;
  page: number;
  level: number;
}

interface TableOfContentsProps {
  items: TocItem[];
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingTop: 80,
    backgroundColor: colors.white,
    fontFamily: 'Open Sans',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 30,
    fontFamily: 'Roboto',
    borderBottom: `2pt solid ${colors.primary}`,
    paddingBottom: 10,
  },
  tocContainer: {
    marginTop: 20,
  },
  tocItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  tocItemLevel1: {
    marginBottom: 15,
  },
  tocItemLevel2: {
    paddingLeft: 20,
    marginBottom: 10,
  },
  tocItemLevel3: {
    paddingLeft: 40,
    marginBottom: 8,
  },
  tocText: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
  },
  tocTextLevel1: {
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'Roboto',
    color: colors.primary,
  },
  tocTextLevel2: {
    fontSize: 11,
    color: colors.text,
  },
  tocTextLevel3: {
    fontSize: 10,
    color: colors.textLight,
  },
  dots: {
    flex: 1,
    borderBottom: `1pt dotted ${colors.border}`,
    marginHorizontal: 8,
    marginBottom: 2,
  },
  pageNumber: {
    fontSize: 11,
    color: colors.textLight,
    minWidth: 25,
    textAlign: 'right',
  },
  pageNumberLevel1: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.primary,
  },
});

export function TableOfContents({ items }: TableOfContentsProps) {
  const getLevelStyles = (level: number) => {
    switch (level) {
      case 1:
        return {
          item: [styles.tocItem, styles.tocItemLevel1],
          text: [styles.tocText, styles.tocTextLevel1],
          pageNumber: [styles.pageNumber, styles.pageNumberLevel1],
        };
      case 2:
        return {
          item: [styles.tocItem, styles.tocItemLevel2],
          text: [styles.tocText, styles.tocTextLevel2],
          pageNumber: styles.pageNumber,
        };
      case 3:
        return {
          item: [styles.tocItem, styles.tocItemLevel3],
          text: [styles.tocText, styles.tocTextLevel3],
          pageNumber: styles.pageNumber,
        };
      default:
        return {
          item: styles.tocItem,
          text: styles.tocText,
          pageNumber: styles.pageNumber,
        };
    }
  };

  return (
    <View style={styles.page}>
      <Text style={styles.title}>Table of Contents</Text>
      <View style={styles.tocContainer}>
        {items.map((item, index) => {
          const levelStyles = getLevelStyles(item.level);
          return (
            <View key={index} style={levelStyles.item}>
              <Text style={levelStyles.text}>{item.title}</Text>
              <View style={styles.dots} />
              <Text style={levelStyles.pageNumber}>{item.page}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}