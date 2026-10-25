import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatIndianCurrency, numberToIndianWords } from "../calc/currency";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#0f172a",
    lineHeight: 1.4,
  },
  receiptBorder: {
    borderWidth: 1.5,
    borderColor: "#1e3a8a",
    borderRadius: 8,
    padding: 24,
    height: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1.5,
    borderBottomColor: "#1e3a8a",
    paddingBottom: 12,
    marginBottom: 16,
  },
  companyName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a8a",
    letterSpacing: 0.5,
  },
  companySub: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 2,
  },
  receiptBadge: {
    backgroundColor: "#1e3a8a",
    color: "#ffffff",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  receiptNo: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginTop: 4,
    textAlign: "right",
  },
  dateText: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 2,
    textAlign: "right",
  },
  detailsBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    marginBottom: 6,
  },
  label: {
    width: "30%",
    fontSize: 8.5,
    color: "#64748b",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  value: {
    width: "70%",
    fontSize: 9,
    color: "#0f172a",
  },
  amountBox: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#3b82f6",
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  amountTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1e40af",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a8a",
  },
  wordsText: {
    fontSize: 8.5,
    fontStyle: "italic",
    color: "#334155",
    marginTop: 4,
    textAlign: "center",
  },
  balanceBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    padding: 8,
    borderRadius: 4,
    marginBottom: 20,
    backgroundColor: "#ffffff",
  },
  balanceLabel: {
    fontSize: 8.5,
    color: "#64748b",
    fontFamily: "Helvetica-Bold",
  },
  balanceValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  footer: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  signatureBox: {
    width: "40%",
    borderTopWidth: 1,
    borderTopColor: "#94a3b8",
    paddingTop: 6,
    textAlign: "center",
  },
  signTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  signSub: {
    fontSize: 7.5,
    color: "#64748b",
  },
  watermark: {
    fontSize: 7.5,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 20,
  },
});

export interface ReceiptData {
  receiptNumber: string;
  receiptDate: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  quoteNumber: string;
  milestone: string;
  paymentMode: string;
  reference?: string;
  amount: number;
  totalQuoteAmount: number;
  outstandingBalance: number;
  notes?: string;
}

export function ReceiptPdfDocument({ receipt }: { receipt: ReceiptData }) {
  const words = numberToIndianWords(Math.round(receipt.amount));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.receiptBorder}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.companyName}>GLASS CARE ENTERPRISES</Text>
              <Text style={styles.companySub}>
                Near Nagwara, Manyata Tech Park • Contact: 7411415842
              </Text>
              <Text style={styles.companySub}>
                GSTIN / Regd: Karnataka • Specialists in Glass & Aluminum Works
              </Text>
            </View>

            <View>
              <Text style={styles.receiptBadge}>PAYMENT RECEIPT</Text>
              <Text style={styles.receiptNo}>{receipt.receiptNumber}</Text>
              <Text style={styles.dateText}>Date: {receipt.receiptDate}</Text>
            </View>
          </View>

          {/* Amount Box */}
          <View style={styles.amountBox}>
            <Text style={styles.amountTitle}>Amount Received</Text>
            <Text style={styles.amountValue}>{formatIndianCurrency(receipt.amount)}</Text>
            <Text style={styles.wordsText}>({words})</Text>
          </View>

          {/* Transaction & Customer Details */}
          <View style={styles.detailsBox}>
            <View style={styles.row}>
              <Text style={styles.label}>Received From:</Text>
              <Text style={[styles.value, { fontFamily: "Helvetica-Bold" }]}>
                {receipt.customerName}
                {receipt.customerPhone ? ` (${receipt.customerPhone})` : ""}
              </Text>
            </View>

            {receipt.customerAddress && (
              <View style={styles.row}>
                <Text style={styles.label}>Site / Address:</Text>
                <Text style={styles.value}>{receipt.customerAddress}</Text>
              </View>
            )}

            <View style={styles.row}>
              <Text style={styles.label}>Quotation Ref:</Text>
              <Text style={[styles.value, { fontFamily: "Helvetica-Bold", color: "#2563eb" }]}>
                {receipt.quoteNumber}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Milestone / Purpose:</Text>
              <Text style={styles.value}>{receipt.milestone}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Payment Mode:</Text>
              <Text style={styles.value}>{receipt.paymentMode}</Text>
            </View>

            {receipt.reference && (
              <View style={styles.row}>
                <Text style={styles.label}>Transaction Ref / UTR:</Text>
                <Text style={[styles.value, { fontFamily: "Courier" }]}>{receipt.reference}</Text>
              </View>
            )}

            {receipt.notes && (
              <View style={styles.row}>
                <Text style={styles.label}>Remarks:</Text>
                <Text style={styles.value}>{receipt.notes}</Text>
              </View>
            )}
          </View>

          {/* Quote Account Summary */}
          <View style={styles.balanceBox}>
            <View>
              <Text style={styles.balanceLabel}>Total Quote Value</Text>
              <Text style={styles.balanceValue}>{formatIndianCurrency(receipt.totalQuoteAmount)}</Text>
            </View>
            <View>
              <Text style={styles.balanceLabel}>This Payment</Text>
              <Text style={[styles.balanceValue, { color: "#16a34a" }]}>
                {formatIndianCurrency(receipt.amount)}
              </Text>
            </View>
            <View>
              <Text style={styles.balanceLabel}>Outstanding Balance</Text>
              <Text style={[styles.balanceValue, { color: receipt.outstandingBalance > 0 ? "#dc2626" : "#16a34a" }]}>
                {formatIndianCurrency(receipt.outstandingBalance)}
              </Text>
            </View>
          </View>

          {/* Signatures & Verification */}
          <View style={styles.footer}>
            <View style={{ width: "50%" }}>
              <Text style={{ fontSize: 7.5, color: "#64748b" }}>
                * This is a computer generated receipt. Subject to realization of Cheque / Electronic transfer.
              </Text>
              <Text style={{ fontSize: 7.5, color: "#64748b", marginTop: 2 }}>
                Thank you for your business with Glass Care Enterprises!
              </Text>
            </View>

            <View style={styles.signatureBox}>
              <Text style={styles.signTitle}>For GLASS CARE ENTERPRISES</Text>
              <Text style={[styles.signSub, { marginTop: 20 }]}>Authorized Signatory</Text>
            </View>
          </View>

          <Text style={styles.watermark}>Glass Care Enterprises • Masque Road, Richards Town, Bangalore</Text>
        </View>
      </Page>
    </Document>
  );
}

