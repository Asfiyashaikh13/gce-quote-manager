import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { formatIndianCurrency } from "../calc/currency";
import { GLASS_CARE_LOGO } from "./logoBase64";

// Helper for clean PDF number formatting without WinAnsi font symbol artifacts
function fmt(val: number | string | undefined | null): string {
  if (val === undefined || val === null || isNaN(Number(val))) return "0.00";
  return formatIndianCurrency(Number(val), { symbol: "", showDecimals: true, decimals: 2 });
}

function fmtTotal(val: number | string | undefined | null): string {
  if (val === undefined || val === null || isNaN(Number(val))) return "0.00";
  return formatIndianCurrency(Number(val), { symbol: "Rs. ", showDecimals: true, decimals: 2 });
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 28,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },

  // Top Header Layout matching reference
  headerLayout: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  brandSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "60%",
  },
  brandLogo: {
    width: 54,
    height: 54,
    marginRight: 12,
    objectFit: "contain",
  },
  companyDetails: {
    flexDirection: "column",
    justifyContent: "center",
  },
  companyName: {
    fontSize: 16.5,
    fontFamily: "Helvetica-Bold",
    color: "#084a9b",
    letterSpacing: 0.3,
    marginBottom: 2.5,
  },
  companyTagline: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#ef7625",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 4.5,
  },
  companyAddress: {
    fontSize: 7,
    color: "#334155",
    marginBottom: 1.2,
    lineHeight: 1.25,
  },
  companyGstinRow: {
    fontSize: 7.2,
    marginTop: 2,
    marginBottom: 1,
    color: "#0f172a",
  },
  companyGstinBold: {
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  companyContactRow: {
    fontSize: 7,
    color: "#334155",
    marginTop: 1,
  },

  // Document Metadata (Right aligned)
  docMetaSection: {
    width: "38%",
    alignItems: "flex-end",
  },
  docMainTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#084a9b",
    letterSpacing: 1.2,
    marginBottom: 6,
    textAlign: "right",
  },
  metaTable: {
    width: "100%",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 2.8,
    fontSize: 7.5,
    alignItems: "center",
  },
  metaLabel: {
    color: "#475569",
    width: 86,
    textAlign: "right",
    paddingRight: 6,
    fontFamily: "Helvetica",
  },
  metaValue: {
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    width: 90,
    textAlign: "left",
  },

  // 2.5px Deep Navy Accent Divider
  accentDivider: {
    height: 2.5,
    backgroundColor: "#084a9b",
    marginBottom: 9,
  },

  // BILL TO Box with Left Orange Border
  billToBox: {
    borderWidth: 0.75,
    borderColor: "#cbd5e1",
    borderLeftWidth: 3.5,
    borderLeftColor: "#ef7625",
    backgroundColor: "#f8fafc",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 3,
    marginBottom: 9,
  },
  billToHeader: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2.5,
  },
  customerName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#084a9b",
    marginBottom: 3,
  },
  customerGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.2,
    color: "#334155",
  },
  customerCol: {
    width: "48%",
  },
  customerLine: {
    marginBottom: 1.5,
    lineHeight: 1.25,
  },
  customerGstinText: {
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginTop: 1.5,
  },

  // Main Items Table matching reference
  itemsTable: {
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 9,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0f2b48",
    paddingVertical: 5,
    paddingHorizontal: 4,
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    textTransform: "uppercase",
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 4.5,
    paddingHorizontal: 4,
    fontSize: 7.2,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#f8fafc",
  },

  colNum: { width: "4%", textAlign: "center", color: "#64748b" },
  colDesc: { width: "38%", paddingRight: 6 },
  colHsn: { width: "10%", textAlign: "center", color: "#475569" },
  colQty: { width: "10%", textAlign: "center", color: "#334155" },
  colRate: { width: "10%", textAlign: "right", color: "#334155" },
  colGstPercent: { width: "8%", textAlign: "center", color: "#475569" },
  colGstAmt: { width: "10%", textAlign: "right", color: "#334155" },
  colAmount: { width: "10%", textAlign: "right", fontFamily: "Helvetica-Bold", color: "#0f172a", paddingRight: 2 },

  itemTitle: {
    fontFamily: "Helvetica-Bold",
    color: "#084a9b",
    fontSize: 7.8,
    marginBottom: 1.5,
  },
  itemSub: {
    fontSize: 6.5,
    color: "#475569",
    marginBottom: 1,
    lineHeight: 1.2,
  },
  itemCutting: {
    fontSize: 6.5,
    color: "#0284c7",
    marginBottom: 1,
  },

  // Bottom 2-Column Summary Layout
  bottomLayout: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 9,
  },
  bottomLeft: {
    width: "50%",
  },
  bottomRight: {
    width: "47%",
  },

  amountWordsCard: {
    borderWidth: 0.75,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRadius: 3,
    marginBottom: 5,
  },
  amountWordsTitle: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 1.5,
  },
  amountWordsText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-BoldOblique",
    color: "#084a9b",
    lineHeight: 1.3,
  },

  termsCard: {
    borderWidth: 0.75,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRadius: 3,
    marginBottom: 5,
  },
  termsTitle: {
    fontSize: 6.8,
    fontFamily: "Helvetica-Bold",
    color: "#084a9b",
    marginBottom: 2.5,
    textTransform: "uppercase",
  },
  termLine: {
    fontSize: 5.8,
    color: "#334155",
    marginBottom: 1.2,
    lineHeight: 1.22,
  },

  bankCard: {
    borderWidth: 0.75,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRadius: 3,
  },
  bankTitle: {
    fontSize: 6.8,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  bankLine: {
    fontSize: 6.2,
    color: "#334155",
    marginBottom: 1,
    lineHeight: 1.22,
  },

  // Structured Totals Table
  totalsTable: {
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    borderRadius: 2,
    overflow: "hidden",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    fontSize: 7.2,
    alignItems: "center",
  },
  totalsRowLabel: {
    color: "#334155",
    fontFamily: "Helvetica",
  },
  totalsRowVal: {
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textAlign: "right",
  },

  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff7ed",
    borderTopWidth: 2,
    borderTopColor: "#ef7625",
    borderBottomWidth: 2,
    borderBottomColor: "#ef7625",
    paddingVertical: 5,
    paddingHorizontal: 7,
    alignItems: "center",
  },
  grandTotalLabel: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#084a9b",
    textTransform: "uppercase",
  },
  grandTotalVal: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: "#084a9b",
  },

  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    paddingHorizontal: 7,
    fontSize: 7.2,
    alignItems: "center",
  },

  // Signature Block
  footerSignSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 8,
    paddingTop: 4,
  },
  sigThanks: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Oblique",
    color: "#64748b",
  },
  sigRight: {
    textAlign: "center",
    alignItems: "center",
    width: 130,
  },
  sigOwnerName: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 18,
  },
  sigLineText: {
    width: 120,
    borderTopWidth: 1.2,
    borderTopColor: "#0f172a",
    paddingTop: 2.5,
    fontSize: 6.8,
    color: "#475569",
    textAlign: "center",
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
    customerGstin?: string | null;
    customerBuilding?: string | null;
    customerFlat?: string | null;
    customerAddress?: string | null;
    customerState: string;
    destinationState: string;
    totalPaid?: number;
    balanceDue?: number;
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
  const companyAddressLine1 = "No. 122/1 Kogilu Main Road, Bellahalli Cross";
  const companyAddressLine2 = "Yelahanka, Bengaluru Urban, Karnataka 560064 India";
  const companyGstin = settings?.companyGstin || "29BNYPN6916L1ZU";
  const companyPhone = settings?.companyPhone || "91-9945988852";
  const companyEmail = settings?.companyEmail || "glasscare.enter55@gmail.com";

  const bankName = settings?.bankName || "State Bank of India";
  const bankBranch = settings?.bankBranch || "Masque Road, Richards Town, Bangalore 560005";
  const bankAccount = settings?.bankAccount || "42443380892";
  const bankIfsc = settings?.bankIfsc || "SBIN0002263";
  const bankUpi = settings?.bankUpi || "9945988552@upi";

  const termsString =
    settings?.terms ||
    `1. Order once confirmed will not be taken back or exchanged.\n2. Any complaint related to processing quality should be informed at time of unloading duly remarked on DC.\n3. All disputes shall be subject to Bangalore jurisdiction only.\n4. Initial payment 70% of gross price to be paid at the time of ordering.\n5. Interim payment 20% of gross price on delivery pallet glass & material of the goods to be used for the work.\n6. Final payment 10% of gross price on completion of works.`;

  const termsLines = termsString
    .split("\n")
    .map((t) => t.trim().replace(/^(\d+)[\]\)]\s*/, "$1. "))
    .filter((t) => t.length > 0);

  // Document Type Header matching reference
  const num = (quote.quoteNumber || "").toUpperCase();
  let docTitle = "TAX INVOICE";
  if (num.includes("BILL")) docTitle = "BILL";
  else if (num.includes("EST")) docTitle = "ESTIMATE";
  else if (num.includes("INV")) docTitle = "TAX INVOICE";
  else if (num.includes("QT")) docTitle = "QUOTATION";

  const dateObj = new Date(quote.createdAt);
  const createdDate = !isNaN(dateObj.getTime())
    ? `${String(dateObj.getDate()).padStart(2, "0")}/${String(dateObj.getMonth() + 1).padStart(2, "0")}/${dateObj.getFullYear()}`
    : "21/10/2026";

  const isKarnataka = (quote.destinationState || "Karnataka").toLowerCase().includes("karnataka");
  const stateCode = isKarnataka ? "29" : "12";
  const isPaid = quote.status === "PAID";
  const totalPaid = quote.totalPaid !== undefined ? quote.totalPaid : isPaid ? quote.displayTotal : 0;
  const balanceDue = quote.balanceDue !== undefined ? quote.balanceDue : Math.max(0, quote.displayTotal - totalPaid);

  return (
    <Document title={`${docTitle}-${quote.quoteNumber}`} author={companyName}>
      <Page size="A4" style={styles.page}>
        {/* Header Block matching reference */}
        <View style={styles.headerLayout}>
          {/* Brand with Official Logo */}
          <View style={styles.brandSection}>
            <Image src={GLASS_CARE_LOGO} style={styles.brandLogo} />
            <View style={styles.companyDetails}>
              <Text style={styles.companyName}>{companyName}</Text>
              <Text style={styles.companyTagline}>FRAME YOUR VISION</Text>
              <Text style={styles.companyAddress}>{companyAddressLine1}</Text>
              <Text style={styles.companyAddress}>{companyAddressLine2}</Text>
              <Text style={styles.companyGstinRow}>
                GSTIN <Text style={styles.companyGstinBold}>{companyGstin}</Text>
              </Text>
              <Text style={styles.companyContactRow}>
                {companyPhone} | {companyEmail}
              </Text>
            </View>
          </View>

          {/* Right: Document Title & Meta Table */}
          <View style={styles.docMetaSection}>
            <Text style={styles.docMainTitle}>{docTitle}</Text>
            <View style={styles.metaTable}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}># :</Text>
                <Text style={styles.metaValue}>{quote.quoteNumber}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>
                  {docTitle === "BILL" ? "Bill Date" : "Invoice Date"} :
                </Text>
                <Text style={styles.metaValue}>{createdDate}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Terms :</Text>
                <Text style={styles.metaValue}>Due on Receipt</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Due Date :</Text>
                <Text style={styles.metaValue}>{createdDate}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Place Of Supply :</Text>
                <Text style={styles.metaValue}>
                  {quote.destinationState || "Karnataka"} ({stateCode})
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Payment Status :</Text>
                <Text
                  style={[
                    styles.metaValue,
                    { color: isPaid ? "#15803d" : "#ef4444" },
                  ]}
                >
                  {isPaid ? "Paid" : "Due"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 2.5px Deep Navy Accent Divider */}
        <View style={styles.accentDivider} />

        {/* BILL TO Card with Left Orange Accent */}
        <View style={styles.billToBox}>
          <Text style={styles.billToHeader}>BILL TO:</Text>
          <Text style={styles.customerName}>{quote.customerName || "Valued Client"}</Text>
          <View style={styles.customerGrid}>
            <View style={styles.customerCol}>
              {quote.customerFlat ? (
                <Text style={styles.customerLine}>{quote.customerFlat}</Text>
              ) : null}
              {quote.customerAddress && quote.customerAddress !== quote.customerFlat && !quote.customerAddress.includes(quote.customerFlat || "") ? (
                <Text style={styles.customerLine}>{quote.customerAddress}</Text>
              ) : null}
              <Text style={styles.customerLine}>
                {quote.customerState || quote.destinationState || "Karnataka"}, India
              </Text>
              {quote.customerGstin ? (
                <Text style={styles.customerGstinText}>
                  Customer GSTIN: {quote.customerGstin}
                </Text>
              ) : null}
            </View>
            <View style={styles.customerCol}>
              {quote.customerBuilding ? (
                <Text style={styles.customerLine}>Project: {quote.customerBuilding}</Text>
              ) : null}
              <Text style={styles.customerLine}>
                Phone: {quote.customerPhone ? quote.customerPhone : "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* Main Items Table */}
        <View style={styles.itemsTable}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNum}>#</Text>
            <Text style={styles.colDesc}>DESCRIPTION</Text>
            <Text style={styles.colHsn}>HSN/SAC</Text>
            <Text style={styles.colQty}>QTY</Text>
            <Text style={styles.colRate}>RATE</Text>
            <Text style={styles.colGstPercent}>
              {isKarnataka ? "GST %" : "IGST %"}
            </Text>
            <Text style={styles.colGstAmt}>
              {isKarnataka ? "GST AMT" : "IGST AMT"}
            </Text>
            <Text style={styles.colAmount}>AMOUNT</Text>
          </View>

          {quote.items.map((it, idx) => {
            const isAlt = idx % 2 === 1;
            const hsnCode = it.description.toLowerCase().includes("shutter")
              ? "761010"
              : it.description.toLowerCase().includes("mirror")
              ? "700991"
              : "700529";

            return (
              <View key={idx} style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}>
                <Text style={styles.colNum}>{it.itemOrder || idx + 1}</Text>
                <View style={styles.colDesc}>
                  <Text style={styles.itemTitle}>{it.description}</Text>
                  {it.frameHeightMm > 0 && it.frameWidthMm > 0 ? (
                    <Text style={styles.itemSub}>
                      Original size: {it.frameHeightMm} × {it.frameWidthMm} mm
                    </Text>
                  ) : null}
                  {it.quantity > 0 ? (
                    <Text style={styles.itemSub}>Pcs: {it.quantity}</Text>
                  ) : null}
                  {it.sqft > 0 ? (
                    <Text style={styles.itemSub}>Measure: {it.sqft.toFixed(3)} Sqft</Text>
                  ) : null}
                  {!hideCuttingSizes && it.glassCutHeightMm > 0 && it.glassCutWidthMm > 0 ? (
                    <Text style={styles.itemCutting}>
                      Glass Cut: {it.glassCutHeightMm} × {it.glassCutWidthMm} mm (-7mm)
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.colHsn}>{hsnCode}</Text>
                <Text style={styles.colQty}>
                  {it.sqft > 0 ? `${it.sqft.toFixed(3)} Sqft` : `${it.quantity} Pcs`}
                </Text>
                <Text style={styles.colRate}>{fmt(it.rate)}</Text>
                <Text style={styles.colGstPercent}>18%</Text>
                <Text style={styles.colGstAmt}>{fmt(it.gstAmount)}</Text>
                <Text style={styles.colAmount}>{fmt(it.netAmount || (it.rate * it.sqft))}</Text>
              </View>
            );
          })}
        </View>

        {/* Bottom 2-Column Summary */}
        <View style={styles.bottomLayout}>
          {/* Left Column: Words, Terms, Bank */}
          <View style={styles.bottomLeft}>
            <View style={styles.amountWordsCard}>
              <Text style={styles.amountWordsTitle}>TOTAL IN WORDS</Text>
              <Text style={styles.amountWordsText}>
                &ldquo;{quote.displayTotalWords || "Indian Rupees Zero Only"}&rdquo;
              </Text>
            </View>

            <View style={styles.termsCard}>
              <Text style={styles.termsTitle}>TERMS &amp; CONDITIONS:</Text>
              {termsLines.slice(0, 6).map((line, idx) => (
                <Text key={idx} style={styles.termLine}>
                  {line}
                </Text>
              ))}
            </View>

            <View style={styles.bankCard}>
              <Text style={styles.bankTitle}>BANK DETAILS FOR PAYMENT:</Text>
              <Text style={styles.bankLine}>A/C Name: Glass Care Enterprises</Text>
              <Text style={styles.bankLine}>
                Bank: {bankName} | Branch: {bankBranch}
              </Text>
              <Text style={styles.bankLine}>
                A/C No: {bankAccount} | IFSC: {bankIfsc} | UPI: {bankUpi}
              </Text>
            </View>
          </View>

          {/* Right Column: Structured Summary Table */}
          <View style={styles.bottomRight}>
            <View style={styles.totalsTable}>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsRowLabel}>Sub Total</Text>
                <Text style={styles.totalsRowVal}>{fmt(quote.subTotal)}</Text>
              </View>

              {isKarnataka ? (
                <>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsRowLabel}>CGST (9%)</Text>
                    <Text style={styles.totalsRowVal}>{fmt(quote.cgstTotal)}</Text>
                  </View>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsRowLabel}>SGST (9%)</Text>
                    <Text style={styles.totalsRowVal}>{fmt(quote.sgstTotal)}</Text>
                  </View>
                </>
              ) : (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsRowLabel}>IGST (18%)</Text>
                  <Text style={styles.totalsRowVal}>{fmt(quote.igstTotal || quote.gstTotal)}</Text>
                </View>
              )}

              <View style={styles.totalsRow}>
                <Text style={styles.totalsRowLabel}>Rounding</Text>
                <Text style={styles.totalsRowVal}>{fmt(quote.roundOff)}</Text>
              </View>

              {/* Total Row with Signature Orange Borders */}
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalVal}>{fmtTotal(quote.displayTotal)}</Text>
              </View>

              <View style={styles.totalsRow}>
                <Text style={styles.totalsRowLabel}>Payment Status</Text>
                <Text
                  style={[
                    styles.totalsRowVal,
                    { color: isPaid ? "#15803d" : "#ef4444" },
                  ]}
                >
                  {isPaid ? "Paid" : "Due"}
                </Text>
              </View>

              <View style={styles.totalsRow}>
                <Text style={styles.totalsRowLabel}>Payment Made</Text>
                <Text style={styles.totalsRowVal}>{fmt(totalPaid)}</Text>
              </View>

              <View style={styles.balanceRow}>
                <Text style={[styles.totalsRowLabel, { fontFamily: "Helvetica-Bold" }]}>
                  Balance Due
                </Text>
                <Text style={[styles.totalsRowVal, { fontSize: 8.5 }]}>
                  {fmt(balanceDue)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer & Signature Section */}
        <View style={styles.footerSignSection}>
          <Text style={styles.sigThanks}>Thanks for your business.</Text>
          <View style={styles.sigRight}>
            <Text style={styles.sigOwnerName}>Khursheed</Text>
            <Text style={styles.sigLineText}>Authorized Signature</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
