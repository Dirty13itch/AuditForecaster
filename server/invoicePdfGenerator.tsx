import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { format } from 'date-fns';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2px solid #c93132',
    paddingBottom: 20,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#c93132',
    marginBottom: 4,
  },
  companyInfo: {
    fontSize: 9,
    color: '#666',
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  invoiceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  infoBlock: {
    flex: 1,
  },
  label: {
    fontSize: 8,
    color: '#666',
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    marginBottom: 8,
  },
  billTo: {
    marginBottom: 30,
  },
  billToTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#c93132',
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderBottom: '1px solid #ddd',
    padding: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #eee',
    padding: 8,
  },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: 'right' },
  col3: { flex: 1, textAlign: 'right' },
  col4: { flex: 1, textAlign: 'right' },
  totals: {
    marginTop: 20,
    marginLeft: 'auto',
    width: 200,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 10,
  },
  totalValue: {
    fontSize: 10,
    textAlign: 'right',
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTop: '2px solid #c93132',
    marginTop: 8,
    fontWeight: 'bold',
    fontSize: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
    borderTop: '1px solid #eee',
    paddingTop: 10,
  },
});

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  periodStart: Date;
  periodEnd: Date;
  builderName: string;
  builderAddress?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
  }>;
  subtotal: string;
  tax: string;
  total: string;
}

export function InvoicePDF({ data }: { data: InvoiceData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>Ulrich Energy Auditing</Text>
          <Text style={styles.companyInfo}>RESNET-Certified Energy Auditing Services</Text>
          <Text style={styles.companyInfo}>Professional Field Inspection Solutions</Text>
        </View>

        <View style={styles.invoiceInfo}>
          <View style={styles.infoBlock}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.label}>Invoice Number</Text>
            <Text style={styles.value}>{data.invoiceNumber}</Text>
            <Text style={styles.label}>Invoice Date</Text>
            <Text style={styles.value}>{format(data.invoiceDate, 'MMMM d, yyyy')}</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.label}>Billing Period</Text>
            <Text style={styles.value}>
              {format(data.periodStart, 'MMM d, yyyy')} - {format(data.periodEnd, 'MMM d, yyyy')}
            </Text>
          </View>
        </View>

        <View style={styles.billTo}>
          <Text style={styles.billToTitle}>BILL TO</Text>
          <Text style={styles.value}>{data.builderName}</Text>
          {data.builderAddress && <Text style={styles.companyInfo}>{data.builderAddress}</Text>}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Description</Text>
            <Text style={styles.col2}>Qty</Text>
            <Text style={styles.col3}>Unit Price</Text>
            <Text style={styles.col4}>Amount</Text>
          </View>
          {data.lineItems.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.col1}>{item.description}</Text>
              <Text style={styles.col2}>{item.quantity}</Text>
              <Text style={styles.col3}>${item.unitPrice}</Text>
              <Text style={styles.col4}>${item.lineTotal}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>${data.subtotal}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax</Text>
            <Text style={styles.totalValue}>${data.tax}</Text>
          </View>
          <View style={styles.grandTotal}>
            <Text>Total</Text>
            <Text>${data.total}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Thank you for your business</Text>
          <Text>Questions? Contact us at your convenience</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  const doc = <InvoicePDF data={data} />;
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
