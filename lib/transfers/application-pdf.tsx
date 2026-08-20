import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type {
  TransferApplicationPdfData,
  TransferPartyDetails,
} from "@/lib/transfers/application-data";

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
    marginBottom: 16,
    fontSize: 9,
    lineHeight: 1.4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  brand: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: sea,
  },
  title: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    maxWidth: 280,
  },
  meta: {
    marginTop: 4,
    color: muted,
    textAlign: "right",
  },
  section: {
    marginBottom: 14,
  },
  heading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    marginBottom: 6,
    color: sea,
  },
  row: {
    flexDirection: "row",
    marginBottom: 3,
  },
  label: {
    width: "38%",
    color: muted,
  },
  value: {
    width: "62%",
  },
  parties: {
    flexDirection: "row",
    gap: 12,
  },
  party: {
    flex: 1,
    borderWidth: 1,
    borderColor: line,
    padding: 8,
  },
  signLine: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: ink,
    paddingTop: 4,
    color: muted,
    fontSize: 8,
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

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value?.trim() ? value : "—"}</Text>
    </View>
  );
}

function PartyBlock({
  heading,
  party,
}: {
  heading: string;
  party: TransferPartyDetails;
}) {
  const kind =
    party.entity_kind === "COMPANY"
      ? "Company"
      : party.entity_kind === "INDIVIDUAL"
        ? "Individual"
        : "—";
  const names = party.signatories
    .map((item) => item.full_name.trim())
    .filter(Boolean);

  return (
    <View style={styles.party}>
      <Text style={styles.heading}>{heading}</Text>
      <Field label="Legal name" value={party.legal_name} />
      <Field label="Trading name" value={party.trading_name} />
      <Field label="Entity" value={kind} />
      <Field label="ABN" value={party.abn} />
      <Field label="ACN" value={party.acn} />
      <Field label="Phone" value={party.phone} />
      <Field label="Mobile" value={party.mobile} />
      <Field label="Registered address" value={party.registered_address} />
      <Field label="Postal address" value={party.postal_address} />
      <Field
        label="QLD fisheries client no."
        value={party.profile?.client_reference ?? null}
      />
      <Field
        label="Commercial fishing licence"
        value={party.profile?.licence_number ?? null}
      />
      <Field
        label="Fishery symbols"
        value={party.profile?.fishery_symbols ?? null}
      />
      <Text style={{ marginTop: 8, fontFamily: "Helvetica-Bold" }}>
        Execution
      </Text>
      {(names.length > 0 ? names : ["Authorised signatory"]).map((name) => (
        <View key={name} wrap={false}>
          <Text style={{ marginTop: 8 }}>{name}</Text>
          <Text style={styles.signLine}>
            Signature / date — witness name, address, and signature
          </Text>
        </View>
      ))}
    </View>
  );
}

export function TransferApplicationDocument({
  data,
}: {
  data: TransferApplicationPdfData;
}) {
  return (
    <Document
      title={`${data.formType} ${data.formVersion} — FQX order ${data.orderId}`}
      author="Fisheries Quota Exchange"
      subject={data.title}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.banner}>
          <Text>
            UNSIGNED APPLICATION — Prepared by FQX from stored business details.
            This is not the official Fisheries Queensland form layout. Print,
            sign, and witness offline. Do not submit this unsigned copy.
          </Text>
        </View>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Fisheries Quota Exchange</Text>
            <Text style={{ color: muted, marginTop: 4 }}>Queensland transfer</Text>
          </View>
          <View>
            <Text style={styles.title}>{data.title}</Text>
            <Text style={styles.meta}>
              {data.formType} {data.formVersion}
            </Text>
            <Text style={styles.meta}>Order {data.orderId}</Text>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.heading}>Quota</Text>
          <Field label="Offering" value={data.offeringLabel} />
          <Field label="Fishery" value={data.fisheryName} />
          <Field label="Quantity" value={`${data.quantity} ${data.unitLabel}`} />
        </View>
        <View style={styles.parties}>
          <PartyBlock heading="Transferor (seller)" party={data.seller} />
          <PartyBlock heading="Transferee (buyer)" party={data.buyer} />
        </View>
        <Text style={styles.footer}>
          FQX order {data.orderId}. Signatures and witnessing must follow{" "}
          {data.formType} requirements, including any independent adult witness.
        </Text>
      </Page>
    </Document>
  );
}
