import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatIndianCurrency } from "../calc/currency";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1e293b",
    lineHeight: 1.3,
  },
  headerContainer: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#2563eb",
    paddingBottom: 10,
    marginBottom: 12,
  },
  companyName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a8a",
    letterSpacing: 0.5,
  },
  companyAddress: {
    fontSize: 8.5,
    color: "#64748b",
    marginTop: 2,
  },
  companyContact: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
    marginTop: 2,
  },
  metaGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
  },
  metaCol: {
    width: "48%",
  },
  metaLabel: {
    fontSize: 7.5,
    color: "#64748b",
    textTransform: "uppercase",
  },
  metaValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 3,
  },
  table: {
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: "#475569",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 4.5,
    paddingHorizontal: 4,
    fontSize: 8,
  },
  colNum: { width: "4%", textAlign: "center" },
  colDesc: { width: "26%" },
  colFrame: { width: "13%", textAlign: "right" },
  colRound: { width: "13%", textAlign: "right" },
  colQty: { width: "6%", textAlign: "center" },
  colSqft: { width: "8%", textAlign: "right" },
  colRate: { width: "9%", textAlign: "right" },
  colGst: { width: "9%", textAlign: "right" },
  colTotal: { width: "12%", textAlign: "right" },

  totalsSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  wordsBlock: {
    width: "55%",
    padding: 6,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
  },
  wordsLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
  },
  wordsText: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a8a",
    marginTop: 2,
    fontStyle: "italic",
  },
  totalsTable: {
    width: "42%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    fontSize: 8,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderTopWidth: 1.5,
    borderColor: "#2563eb",
    marginTop: 3,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a8a",
  },

  bankAndTerms: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
  },
  bankBlock: {
    width: "48%",
    backgroundColor: "#f8fafc",
    padding: 6,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
  },
  bankTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  bankLine: {
    fontSize: 7.5,
    color: "#334155",
    marginBottom: 1.5,
  },
  termsBlock: {
    width: "48%",
  },
  termsTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 3,
  },
  termLine: {
    fontSize: 6.8,
    color: "#475569",
    marginBottom: 2,
    lineHeight: 1.25,
  },

  footer: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  thanksText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
  },
  signatureBox: {
    width: 140,
    textAlign: "center",
    borderTopWidth: 0.5,
    borderColor: "#64748b",
    paddingTop: 4,
    fontSize: 7.5,
    color: "#64748b",
  },
});

export interface QuotePdfProps {
  quote: {
    quoteNumber: string;
    version: number;
    createdAt: string | Date;
    validUntil?: string | Date | null;
    customerName: string;
    customerBuilding?: string | null;
    customerFlat?: string | null;
    customerAddress?: string | null;
    customerState: string;
    destinationState: string;
    subTotal: number;
    cgstTotal: number;
    sgstTotal: number;
    igstTotal: number;
    gstTotal: number;
    grandTotal: number;
    roundOff: number;
    displayTotal: number;
    displayTotalWords?: string | null;
    items: Array<{
      itemOrder: number;
      description: string;
      frameHeightMm: number;
      frameWidthMm: number;
      roundedHeightMm: number;
      roundedWidthMm: number;
      glassCutHeightMm: number;
      glassCutWidthMm: number;
      quantity: number;
      rate: number;
      sqft: number;
      gstAmount: number;
      netAmount: number;
      totalAmount: number;
    }>;
  };
  settings?: {
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    bankName?: string;
    bankBranch?: string;
    bankAccount?: string;
    bankIfsc?: string;
    bankUpi?: string;
    terms?: string;
  };
  hideCuttingSizes?: boolean;
}

export function QuotePdfDocument({ quote, settings, hideCuttingSizes = false }: QuotePdfProps) {
  const companyName = settings?.companyName || "GLASS CARE ENTERPRISES";
  const companyAddress = settings?.companyAddress || "Near Nagwara, Manyata Tech Park";
  const companyPhone = settings?.companyPhone || "7411415842";

  const bankName = settings?.bankName || "State Bank of India";
  const bankBranch = settings?.bankBranch || "Masque Road, Richards Town, Bangalore 560005";
  const bankAccount = settings?.bankAccount || "42443380892";
  const bankIfsc = settings?.bankIfsc || "SBIN0002263";
  const bankUpi = settings?.bankUpi || "9945988552@upi";

  const termsString =
    settings?.terms ||
    `1] Order once confirmed\n2] Any complaint related to processing quality should be informed at time of unloading duly remarked on DC\n3] All disputes shall be subject to Bangalore jurisdiction only\n4] Initial payment 70% of gross price to be paid at the time of ordering\n5] Interim payment 20% of gross price on delivery pallet glass & material of the goods to be used for the work\n6] Final payment 10% of gross price on completion of works.`;

  const termsLines = termsString.split("\n").filter((t) => t.trim().length > 0);
  const createdDate = new Date(quote.createdAt).toLocaleDateString();
  const validUntilDate = quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : "-";

  return (
    <Document title={`Quote-${quote.quoteNumber}`} author={companyName}>
      <Page size="A4" style={styles.page}>
        {/* Header Block */}
        <View style={styles.headerContainer}>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.companyAddress}>{companyAddress}</Text>
          <Text style={styles.companyContact}>Contact: {companyPhone}</Text>
        </View>

        {/* Customer & Quote Meta Grid */}
        <View style={styles.metaGrid}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Customer Details</Text>
            <Text style={styles.metaValue}>{quote.customerName}</Text>
            {(quote.customerFlat || quote.customerBuilding) && (
              <Text style={styles.metaValue}>
                {quote.customerFlat ? `Flat ${quote.customerFlat}, ` : ""}
                {quote.customerBuilding || ""}
              </Text>
            )}
            <Text style={styles.metaValue}>State: {quote.destinationState || "Karnataka"}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Quote Reference</Text>
            <Text style={styles.metaValue}>
              {quote.quoteNumber} {quote.version > 1 ? `(Rev ${quote.version})` : ""}
            </Text>
            <Text style={styles.metaValue}>Date: {createdDate}</Text>
            <Text style={styles.metaValue}>Valid Until: {validUntilDate}</Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNum}>#</Text>
            <Text style={styles.colDesc}>Product / Item</Text>
            <Text style={styles.colFrame}>Frame (mm)</Text>
            <Text style={styles.colRound}>{hideCuttingSizes ? "Size (mm)" : "Rounded"}</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colSqft}>Sqft</Text>
            <Text style={styles.colRate}>Rate</Text>
            <Text style={styles.colGst}>GST</Text>
            <Text style={styles.colTotal}>Amount</Text>
          </View>

          {quote.items.map((it, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.colNum}>{it.itemOrder || idx + 1}</Text>
              <Text style={styles.colDesc}>{it.description}</Text>
              <Text style={styles.colFrame}>
                {it.frameHeightMm} × {it.frameWidthMm}
              </Text>
              <Text style={styles.colRound}>
                {it.roundedHeightMm} × {it.roundedWidthMm}
              </Text>
              <Text style={styles.colQty}>{it.quantity}</Text>
              <Text style={styles.colSqft}>{it.sqft.toFixed(2)}</Text>
              <Text style={styles.colRate}>{it.rate}</Text>
              <Text style={styles.colGst}>{formatIndianCurrency(it.gstAmount)}</Text>
              <Text style={styles.colTotal}>{formatIndianCurrency(it.totalAmount)}</Text>
            </View>
          ))}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.wordsBlock}>
            <Text style={styles.wordsLabel}>Amount in Words:</Text>
            <Text style={styles.wordsText}>
              &ldquo;{quote.displayTotalWords || "Indian Rupee Zero Only"}&rdquo;
            </Text>
          </View>

          <View style={styles.totalsTable}>
            <View style={styles.totalRow}>
              <Text>Sub Total:</Text>
              <Text>{formatIndianCurrency(quote.subTotal)}</Text>
            </View>
            {quote.cgstTotal > 0 && (
              <View style={styles.totalRow}>
                <Text>CGST (9%):</Text>
                <Text>{formatIndianCurrency(quote.cgstTotal)}</Text>
              </View>
            )}
            {quote.sgstTotal > 0 && (
              <View style={styles.totalRow}>
                <Text>SGST (9%):</Text>
                <Text>{formatIndianCurrency(quote.sgstTotal)}</Text>
              </View>
            )}
            {quote.igstTotal > 0 && (
              <View style={styles.totalRow}>
                <Text>IGST (18%):</Text>
                <Text>{formatIndianCurrency(quote.igstTotal)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text>Round Off:</Text>
              <Text>{formatIndianCurrency(quote.roundOff)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text>Final Payable:</Text>
              <Text>{formatIndianCurrency(quote.displayTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Bank & Terms Block */}
        <View style={styles.bankAndTerms}>
          <View style={styles.bankBlock}>
            <Text style={styles.bankTitle}>Bank Details for Payment</Text>
            <Text style={styles.bankLine}>A/c Name: Glass Care Enterprises</Text>
            <Text style={styles.bankLine}>Bank: {bankName}</Text>
            <Text style={styles.bankLine}>A/c No: {bankAccount}</Text>
            <Text style={styles.bankLine}>IFSC: {bankIfsc}</Text>
            <Text style={styles.bankLine}>UPI ID: {bankUpi}</Text>
            <Text style={styles.bankLine}>Branch: {bankBranch}</Text>
          </View>

          <View style={styles.termsBlock}>
            <Text style={styles.termsTitle}>Terms & Conditions</Text>
            {termsLines.map((line, idx) => (
              <Text key={idx} style={styles.termLine}>
                {line}
              </Text>
            ))}
          </View>
        </View>

        {/* Footer & Signature */}
        <View style={styles.footer}>
          <Text style={styles.thanksText}>Thanks for your business.</Text>
          <View style={styles.signatureBox}>
            <Text>For Glass Care Enterprises</Text>
            <Text style={{ marginTop: 20 }}>Authorized Signatory</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

