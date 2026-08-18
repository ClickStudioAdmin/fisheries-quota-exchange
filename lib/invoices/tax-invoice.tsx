import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { TaxInvoiceData } from "@/lib/invoices/types";

const sea = "#1a5c63";
const ink = "#10232b";
const muted = "#3d4f56";
const line = "#d7d0c4";
const warn = "#7a3b11";
const warnBg = "#f3e4d4";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: ink,
    backgroundColor: "#ffffff",
  },
  banner: {
    backgroundColor: warnBg,
    color: warn,
    padding: 8,
    marginBottom: 20,
    fontSize: 9,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  brand: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: sea,
  },
  title: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  meta: {
    marginTop: 4,
    color: muted,
    textAlign: "right",
  },
  parties: {
    flexDirection: "row",
    marginBottom: 24,
  },
  party: {
    flex: 1,
    paddingRight: 12,
  },
  partyLabel: {
    fontSize: 8,
    color: muted,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  partyName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    marginBottom: 2,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: ink,
    paddingBottom: 6,
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: line,
  },
  colDesc: { width: "46%" },
  colQty: { width: "18%" },
  colPrice: { width: "18%", textAlign: "right" },
  colAmount: { width: "18%", textAlign: "right" },
  totals: {
    marginTop: 12,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    width: 220,
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalStrong: {
    fontFamily: "Helvetica-Bold",
    borderTopWidth: 1,
    borderTopColor: ink,
    marginTop: 4,
    paddingTop: 6,
  },
  note: {
    color: muted,
    marginTop: 12,
    maxWidth: 360,
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 36,
    left: 40,
    right: 40,
    color: muted,
    fontSize: 8,
  },
});

function Line({
  description,
  quantity,
  price,
  amount,
}: {
  description: string;
  quantity: string;
  price: string;
  amount: string;
}) {
  return (
    <View style={styles.tableRow}>
      <Text style={styles.colDesc}>{description}</Text>
      <Text style={styles.colQty}>{quantity}</Text>
      <Text style={styles.colPrice}>{price}</Text>
      <Text style={styles.colAmount}>{amount}</Text>
    </View>
  );
}

export function TaxInvoiceDocument({ data }: { data: TaxInvoiceData }) {
  return (
    <Document
      title={data.invoiceNumber}
      author="Fisheries Quota Exchange"
      subject={data.title}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.banner}>
          <Text>
            SIMULATED SETTLEMENT — This is a dummy tax invoice for testing. It
            is not a real tax invoice. GST is not calculated. No payment has
            been taken.
          </Text>
        </View>

        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Fisheries Quota Exchange</Text>
            <Text style={{ color: muted, marginTop: 4 }}>FQX</Text>
          </View>
          <View>
            <Text style={styles.title}>{data.title}</Text>
            <Text style={styles.meta}>{data.invoiceNumber}</Text>
            <Text style={styles.meta}>Order {data.orderId}</Text>
            <Text style={styles.meta}>{data.issuedAt}</Text>
          </View>
        </View>

        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>Supplier</Text>
            <Text style={styles.partyName}>{data.supplierName}</Text>
            <Text>ABN {data.supplierAbn}</Text>
          </View>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>Recipient</Text>
            <Text style={styles.partyName}>{data.recipientName}</Text>
            <Text>ABN {data.recipientAbn}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Description</Text>
          <Text style={styles.colQty}>Quantity</Text>
          <Text style={styles.colPrice}>Unit price</Text>
          <Text style={styles.colAmount}>Amount</Text>
        </View>

        {data.lines.map((line) => (
          <Line
            key={`${line.description}-${line.amount}`}
            description={line.description}
            quantity={line.quantity}
            price={line.unitPrice}
            amount={line.amount}
          />
        ))}

        <View style={styles.totals}>
          <View style={[styles.totalRow, styles.totalStrong]}>
            <Text>Total</Text>
            <Text>{data.total}</Text>
          </View>
          <Text style={styles.note}>{data.note}</Text>
        </View>

        <Text style={styles.footer}>
          Generated by FQX after simulated settlement. Replace this template
          when live invoicing is added.
        </Text>
      </Page>
    </Document>
  );
}
