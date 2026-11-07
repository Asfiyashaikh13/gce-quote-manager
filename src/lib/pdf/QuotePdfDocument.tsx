import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatIndianCurrency } from "../calc/currency";

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 8.5,
    fontFamily: "Helvetica",
    color: "#0f172a",
    lineHeight: 1.35,
    backgroundColor: "#ffffff",
  },
  // Header Section
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  companyLeft: {
    width: "55%",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  gcLogoBox: {
    width: 28,
    height: 28,
    borderRadius: 3,
    backgroundColor: "#f0fdf4",
    borderWidth: 1.2,
    borderColor: "#15803d",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  gcLogoText: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#15803d",
  },
  companyName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#14532d",
    letterSpacing: 0.2,
  },
  companyTagline: {
    fontSize: 6.8,
    fontFamily: "Helvetica-Bold",
    color: "#ea580c",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 1,
  },
  companyAddress: {
    fontSize: 7.2,
    color: "#475569",
    lineHeight: 1.3,
    marginTop: 2,
  },
  companyContactRow: {
    fontSize: 7.2,
    color: "#334155",
    marginTop: 1.5,
  },
  companyGstin: {
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  metaRight: {
    width: "42%",
    alignItems: "flex-end",
  },
  docTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#14532d",
    letterSpacing: 0.5,
    marginBottom: 6,
    textAlign: "right",
  },
  metaTable: {
    width: "100%",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 2,
    fontSize: 7.5,
  },
  metaLabel: {
    color: "#475569",
    width: 80,
    textAlign: "right",
    paddingRight: 6,
  },
  metaValue: {
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    width: 95,
    textAlign: "left",
  },
  accentBar: {
    height: 2,
    backgroundColor: "#15803d",
    marginVertical: 6,
    borderRadius: 1,
  },

  // Customer Card
  customerCard: {
    backgroundColor: "#f0fdf4",
    borderWidth: 0.75,
    borderColor: "#86efac",
    borderRadius: 4,
    padding: 7,
    marginBottom: 8,
  },
  customerCardHeader: {
    fontSize: 6.8,
    fontFamily: "Helvetica-Bold",
    color: "#15803d",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  customerName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#14532d",
    marginBottom: 3,
  },
  customerGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: "#334155",
  },
  customerCol: {
    width: "48%",
  },
  customerLine: {
    marginBottom: 1.5,
  },

  // Items Table
  tableContainer: {
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    borderRadius: 3,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#15803d",
    paddingVertical: 4.5,
    paddingHorizontal: 4,
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 7.2,
    textTransform: "uppercase",
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 7.6,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#fcfdfd",
  },
  colNum: { width: "4%", textAlign: "center", color: "#64748b" },
  colDesc: { width: "38%", paddingRight: 4 },
  colDim: { width: "19%", textAlign: "center", color: "#334155" },
  colQty: { width: "12%", textAlign: "center", color: "#334155" },
  colRate: { width: "12%", textAlign: "right", color: "#334155" },
  colAmount: { width: "15%", textAlign: "right", fontFamily: "Helvetica-Bold", color: "#0f172a", paddingRight: 2 },

  itemTitle: {
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    fontSize: 7.8,
  },
  itemSub: {
    fontSize: 6.6,
    color: "#64748b",
    marginTop: 1,
  },
  itemCutting: {
    fontSize: 6.6,
    color: "#0284c7",
    marginTop: 0.5,
  },

  // Bottom / Totals Section
  bottomSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
    marginBottom: 6,
  },
  bottomLeft: {
    width: "53%",
  },
  wordsCard: {
    backgroundColor: "#f0fdf4",
    borderWidth: 0.75,
    borderColor: "#bbf7d0",
    borderRadius: 3,
    padding: 6,
    marginBottom: 6,
  },
  wordsLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#15803d",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  wordsText: {
    fontSize: 8,
    fontFamily: "Helvetica-BoldOblique",
    color: "#14532d",
    marginTop: 2,
  },
  bankCard: {
    backgroundColor: "#f8fafc",
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    borderRadius: 3,
    padding: 6,
  },
  bankTitle: {
    fontSize: 7.2,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  bankLine: {
    fontSize: 6.8,
    color: "#334155",
    marginBottom: 1,
  },

  // Totals Column
  totalsCol: {
    width: "44%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    fontSize: 7.8,
    color: "#334155",
  },
  totalRowBorder: {
    borderTopWidth: 0.5,
    borderColor: "#e2e8f0",
    marginTop: 2,
    paddingTop: 2,
  },
  grandTotalBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#15803d",
    color: "#ffffff",
    paddingVertical: 4.5,
    paddingHorizontal: 6,
    borderRadius: 3,
    marginTop: 4,
    alignItems: "center",
  },
  grandTotalLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase",
  },
  grandTotalValue: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },

  // Terms and Signature
  termsAndSig: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: "#cbd5e1",
  },
  termsCol: {
    width: "58%",
  },
  termsTitle: {
    fontSize: 7.2,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  termLine: {
    fontSize: 6.2,
    color: "#475569",
    marginBottom: 1,
    lineHeight: 1.2,
  },
  sigCol: {
    width: "36%",
    textAlign: "center",
    alignItems: "center",
  },
  sigCompany: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#14532d",
    marginBottom: 24,
  },
  sigLine: {
    width: 120,
    borderTopWidth: 0.5,
    borderTopColor: "#64748b",
    paddingTop: 2,
    fontSize: 7,
    color: "#64748b",
  },
});

export interface QuotePdfProps {
  quote: {
    quoteNumber: string;
    version: number;
    createdAt: string | Date;
    validUntil?: string | Date | null;
    status?: string;
    customerName: string;
    customerPhone?: string | null;
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
    companyEmail?: string;
    companyGstin?: string;
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
  const companyName = settings?.companyName || "Glass Care Enterprises";
  const companyAddress =
    settings?.companyAddress ||
    "No. 122/1 Kogilu Main Road, Bellahalli Cross Yelahanka, Bengaluru Urban, Bengaluru Karnataka 560064 India";
  const companyGstin = settings?.companyGstin || "29BNYPN6916L1ZU";
  const companyPhone = settings?.companyPhone || "+91 9945988852";
  const companyEmail = settings?.companyEmail || "glasscare.enter55@gmail.com";

  const bankName = settings?.bankName || "State Bank of India";
  const bankBranch = settings?.bankBranch || "Masque Road, Richards Town, Bangalore 560005";
  const bankAccount = settings?.bankAccount || "42443380892";
  const bankIfsc = settings?.bankIfsc || "SBIN0002263";
  const bankUpi = settings?.bankUpi || "9945988552@upi";

  const termsString =
    settings?.terms ||
    `1] Order once confirmed\n2] Any complaint related to processing quality should be informed at time of unloading duly remarked on DC\n3] All disputes shall be subject to Bangalore jurisdiction only\n4] Initial payment 70% of gross price to be paid at the time of ordering\n5] Interim payment 20% of gross price on delivery pallet glass & material of the goods to be used for the work\n6] Final payment 10% of gross price on completion of works.`;

  const termsLines = termsString.split("\n").filter((t) => t.trim().length > 0);

  // Document Type Header
  const num = quote.quoteNumber || "";
  let docTitle = "QUOTATION";
  if (num.toUpperCase().includes("BILL")) docTitle = "BILL";
  else if (num.toUpperCase().includes("INV")) docTitle = "TAX INVOICE";
  else if (num.toUpperCase().includes("EST")) docTitle = "ESTIMATE";

  const dateObj = new Date(quote.createdAt);
  const createdDate = !isNaN(dateObj.getTime())
    ? `${String(dateObj.getDate()).padStart(2, "0")}/${String(dateObj.getMonth() + 1).padStart(2, "0")}/${dateObj.getFullYear()}`
    : "17/10/2026";

  const paymentStatus =
    quote.status === "PAID"
      ? "Paid"
      : quote.status === "APPROVED" || quote.status === "IN_PRODUCTION"
      ? "Confirmed"
      : "Pending";

  return (
    <Document title={`${docTitle}-${quote.quoteNumber}`} author={companyName}>
      <Page size="A4" style={styles.page}>
        {/* Top Header Block */}
        <View style={styles.topHeader}>
          {/* Left: Brand & Address */}
          <View style={styles.companyLeft}>
            <View style={styles.brandRow}>
              <View style={styles.gcLogoBox}>
                <Text style={styles.gcLogoText}>GC</Text>
              </View>
              <View>
                <Text style={styles.companyName}>{companyName}</Text>
                <Text style={styles.companyTagline}>FRAME YOUR VISION</Text>
              </View>
            </View>
            <Text style={styles.companyAddress}>No. 122/1 Kogilu Main Road, Bellahalli Cross</Text>
            <Text style={styles.companyAddress}>Yelahanka, Bengaluru Urban, Karnataka 560064, India</Text>
            <Text style={styles.companyContactRow}>
              GSTIN: <Text style={styles.companyGstin}>{companyGstin}</Text> | {companyPhone}
            </Text>
            <Text style={styles.companyContactRow}>{companyEmail}</Text>
          </View>

          {/* Right: Document Title & Meta Info */}
          <View style={styles.metaRight}>
            <Text style={styles.docTitle}>{docTitle}</Text>
            <View style={styles.metaTable}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}># :</Text>
                <Text style={styles.metaValue}>{quote.quoteNumber}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{docTitle === "BILL" ? "Bill Date" : "Date"} :</Text>
                <Text style={styles.metaValue}>{createdDate}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Terms :</Text>
                <Text style={styles.metaValue}>Due on Receipt</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Place Of Supply :</Text>
                <Text style={styles.metaValue}>{quote.destinationState || "Karnataka"} (29)</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Payment Status :</Text>
                <Text
                  style={[
                    styles.metaValue,
                    { color: paymentStatus === "Paid" ? "#15803d" : "#ea580c" },
                  ]}
                >
                  {paymentStatus}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Green Divider Accent */}
        <View style={styles.accentBar} />

        {/* Customer Details Box */}
        <View style={styles.customerCard}>
          <Text style={styles.customerCardHeader}>CUSTOMER DETAILS / BILLED TO:</Text>
          <Text style={styles.customerName}>{quote.customerName || "Valued Client"}</Text>
          <View style={styles.customerGrid}>
            <View style={styles.customerCol}>
              {quote.customerFlat ? (
                <Text style={styles.customerLine}>Flat / Unit: {quote.customerFlat}</Text>
              ) : null}
              {quote.customerAddress && quote.customerAddress !== quote.customerFlat ? (
                <Text style={styles.customerLine}>{quote.customerAddress}</Text>
              ) : null}
              <Text style={styles.customerLine}>
                {quote.customerState || quote.destinationState || "Karnataka"}, India
              </Text>
            </View>
            <View style={styles.customerCol}>
              {quote.customerBuilding ? (
                <Text style={styles.customerLine}>Project: {quote.customerBuilding}</Text>
              ) : null}
              <Text style={styles.customerLine}>
                Phone: {quote.customerPhone ? quote.customerPhone : "+91 —"}
              </Text>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNum}>#</Text>
            <Text style={styles.colDesc}>ITEM DESCRIPTION</Text>
            <Text style={styles.colDim}>SIZE / DIMENSIONS</Text>
            <Text style={styles.colQty}>QTY</Text>
            <Text style={styles.colRate}>RATE</Text>
            <Text style={styles.colAmount}>AMOUNT</Text>
          </View>

          {quote.items.map((it, idx) => {
            const isAlt = idx % 2 === 1;
            const dimStr =
              it.frameHeightMm > 0 && it.frameWidthMm > 0
                ? `${it.frameHeightMm} × ${it.frameWidthMm} mm`
                : "—";

            return (
              <View key={idx} style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}>
                <Text style={styles.colNum}>{it.itemOrder || idx + 1}</Text>
                <View style={styles.colDesc}>
                  <Text style={styles.itemTitle}>{it.description}</Text>
                  <Text style={styles.itemSub}>Measure: {it.sqft.toFixed(3)} Sq Ft</Text>
                  {!hideCuttingSizes && it.glassCutHeightMm > 0 && it.glassCutWidthMm > 0 ? (
                    <Text style={styles.itemCutting}>
                      Glass Cut: {it.glassCutHeightMm} × {it.glassCutWidthMm} mm (-7mm)
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.colDim}>{dimStr}</Text>
                <Text style={styles.colQty}>
                  {it.sqft > 0 ? `${it.sqft.toFixed(2)} Sq Ft` : `${it.quantity} Pcs`}
                </Text>
                <Text style={styles.colRate}>₹{it.rate.toFixed(2)}</Text>
                <Text style={styles.colAmount}>{formatIndianCurrency(it.totalAmount)}</Text>
              </View>
            );
          })}
        </View>

        {/* Totals & Amount in Words */}
        <View style={styles.bottomSection}>
          {/* Left: Words & Bank Info */}
          <View style={styles.bottomLeft}>
            <View style={styles.wordsCard}>
              <Text style={styles.wordsLabel}>AMOUNT IN WORDS:</Text>
              <Text style={styles.wordsText}>
                &ldquo;{quote.displayTotalWords || "Indian Rupees Zero Only"}&rdquo;
              </Text>
            </View>

            <View style={styles.bankCard}>
              <Text style={styles.bankTitle}>BANK DETAILS FOR PAYMENT:</Text>
              <Text style={styles.bankLine}>A/C Name: Glass Care Enterprises</Text>
              <Text style={styles.bankLine}>
                Bank: {bankName} | Branch: {bankBranch}
              </Text>
              <Text style={styles.bankLine}>
                A/C No: {bankAccount} | IFSC: {bankIfsc}
              </Text>
              <Text style={styles.bankLine}>UPI ID: {bankUpi}</Text>
            </View>
          </View>

          {/* Right: Totals Grid */}
          <View style={styles.totalsCol}>
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
            <View style={styles.grandTotalBox}>
              <Text style={styles.grandTotalLabel}>TOTAL AMOUNT:</Text>
              <Text style={styles.grandTotalValue}>{formatIndianCurrency(quote.displayTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Terms & Conditions & Signatory */}
        <View style={styles.termsAndSig}>
          <View style={styles.termsCol}>
            <Text style={styles.termsTitle}>TERMS &amp; CONDITIONS:</Text>
            {termsLines.slice(0, 6).map((line, idx) => (
              <Text key={idx} style={styles.termLine}>
                {line}
              </Text>
            ))}
          </View>

          <View style={styles.sigCol}>
            <Text style={styles.sigCompany}>For GLASS CARE ENTERPRISES</Text>
            <Text style={styles.sigLine}>Authorized Signatory</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
