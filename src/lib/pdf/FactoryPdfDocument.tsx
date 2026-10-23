import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { FactoryGroup } from "../factory/types";

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 8.5,
    fontFamily: "Helvetica",
    color: "#0f172a",
    lineHeight: 1.25,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#1e3a8a",
    paddingBottom: 8,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a8a",
  },
  subTitle: {
    fontSize: 8.5,
    color: "#475569",
    marginTop: 2,
  },
  badge: {
    backgroundColor: "#1e3a8a",
    color: "#ffffff",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  metaBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
  },
  metaItem: {
    flexDirection: "column",
  },
  metaLabel: {
    fontSize: 7.5,
    color: "#64748b",
    textTransform: "uppercase",
  },
  metaValue: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#e2e8f0",
    padding: 4,
    marginTop: 8,
    marginBottom: 4,
    color: "#1e293b",
    borderRadius: 2,
  },
  table: {
    width: "100%",
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 0.5,
    borderBottomColor: "#94a3b8",
    paddingVertical: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: "#334155",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 4,
    fontSize: 8,
  },
  colIdx: { width: "5%", textAlign: "center" },
  colGlassCut: { width: "22%", fontFamily: "Helvetica-Bold", color: "#0369a1", paddingLeft: 4 },
  colFrame: { width: "18%", paddingLeft: 4 },
  colQty: { width: "8%", textAlign: "center", fontFamily: "Helvetica-Bold" },
  colSqft: { width: "10%", textAlign: "right", paddingRight: 4 },
  colTag: { width: "25%", paddingLeft: 4 },
  colNotes: { width: "12%", paddingLeft: 4 },

  footerBox: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    paddingTop: 12,
  },
  signBlock: {
    width: "30%",
    borderTopWidth: 0.5,
    borderTopColor: "#94a3b8",
    paddingTop: 4,
    textAlign: "center",
    fontSize: 7.5,
    color: "#64748b",
  },
});

interface FactoryPdfDocumentProps {
  factory: FactoryGroup;
  orderNumber?: string;
  orderDate?: string;
  notes?: string;
}

export function FactoryPdfDocument({
  factory,
  orderNumber = "FCO-CURRENT",
  orderDate = "",
  notes,
}: FactoryPdfDocumentProps) {
  const displayDate = orderDate || "Immediate";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>GLASS CARE ENTERPRISES</Text>
            <Text style={styles.subTitle}>
              Near Nagwara, Manyata Tech Park • Contact: 7411415842
            </Text>
            <Text style={[styles.subTitle, { fontFamily: "Helvetica-Bold", color: "#1e3a8a" }]}>
              FACTORY GLASS CUTTING INDENT
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.badge}>{orderNumber}</Text>
            <Text style={{ fontSize: 8, color: "#64748b", marginTop: 4 }}>Date: {displayDate}</Text>
          </View>
        </View>

        {/* Metadata */}
        <View style={styles.metaBox}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Factory / Processing Unit</Text>
            <Text style={styles.metaValue}>{factory.factoryName}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Total Pieces</Text>
            <Text style={styles.metaValue}>{factory.totalPieces} Pcs</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Total Area</Text>
            <Text style={styles.metaValue}>{factory.totalSqft} Sq.Ft</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Cutting Rule</Text>
            <Text style={[styles.metaValue, { color: "#dc2626" }]}>Frame - 7 mm</Text>
          </View>
        </View>

        {/* Glass Type Tables */}
        {factory.glassTypes.map((gt, gIdx) => (
          <View key={gIdx} wrap={false}>
            <Text style={styles.sectionTitle}>
              {gt.glassType.toUpperCase()} — {gt.totalPieces} Pieces ({gt.totalSqft} Sq.Ft)
            </Text>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.colIdx}>#</Text>
                <Text style={styles.colGlassCut}>Glass Cut (H x W mm)</Text>
                <Text style={styles.colFrame}>Frame (H x W mm)</Text>
                <Text style={styles.colQty}>Qty</Text>
                <Text style={styles.colSqft}>Sq.Ft</Text>
                <Text style={styles.colTag}>Client / Flat / Building</Text>
                <Text style={styles.colNotes}>Remarks</Text>
              </View>

              {gt.items.map((item, idx) => (
                <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? { backgroundColor: "#f8fafc" } : {}]}>
                  <Text style={styles.colIdx}>{idx + 1}</Text>
                  <Text style={styles.colGlassCut}>
                    {item.glassCutHeightMm} x {item.glassCutWidthMm}
                  </Text>
                  <Text style={styles.colFrame}>
                    {item.frameHeightMm} x {item.frameWidthMm}
                  </Text>
                  <Text style={styles.colQty}>{item.quantity}</Text>
                  <Text style={styles.colSqft}>{item.sqft.toFixed(2)}</Text>
                  <Text style={styles.colTag}>
                    {[item.clientName, item.building, item.flat ? `Fl.${item.flat}` : ""].filter(Boolean).join(" - ")}
                  </Text>
                  <Text style={styles.colNotes}>{item.notes || "-"}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {notes && (
          <View style={{ marginTop: 6, padding: 6, backgroundColor: "#fef9c3", borderRadius: 3 }}>
            <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#854d0e" }}>
              FACTORY INSTRUCTIONS: {notes}
            </Text>
          </View>
        )}

        {/* Signatures */}
        <View style={styles.footerBox}>
          <View style={styles.signBlock}>
            <Text>Prepared By (GCE)</Text>
          </View>
          <View style={styles.signBlock}>
            <Text>Checked & Verified By</Text>
          </View>
          <View style={styles.signBlock}>
            <Text>Factory Incharge Sign & Stamp</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
