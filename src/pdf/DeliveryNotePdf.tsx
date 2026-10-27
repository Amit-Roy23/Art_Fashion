import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { formatWeight } from "@/lib/weight";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#222",
  },
  header: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#059669",
    paddingBottom: 10,
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  companyName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#065f46",
    textTransform: "uppercase",
  },
  tagline: {
    fontSize: 8,
    color: "#666",
    marginTop: 2,
  },
  docTitleBlock: {
    textAlign: "right",
  },
  docTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#222",
  },
  docNumber: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#059669",
    marginTop: 3,
  },
  metaGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#ecfdf5",
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    marginBottom: 15,
  },
  metaCol: { width: "48%" },
  metaRow: { flexDirection: "row", marginBottom: 3 },
  metaLabel: { width: 90, fontWeight: "bold", color: "#555" },
  metaValue: { flex: 1, color: "#111" },
  table: {
    width: "100%",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#d1fae5",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    fontWeight: "bold",
    padding: 6,
    color: "#065f46",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    padding: 6,
    alignItems: "center",
  },
  colNum: { width: "8%" },
  colPiece: { width: "32%" },
  colCategory: { width: "20%" },
  colMetal: { width: "20%" },
  colFinalWt: { width: "20%", textAlign: "right" },
  signatures: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 50,
    paddingTop: 10,
  },
  sigBlock: {
    width: "40%",
    borderTopWidth: 1,
    borderTopColor: "#888",
    paddingTop: 5,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 30,
    right: 30,
    fontSize: 7,
    color: "#888",
    textAlign: "center",
  },
});

export interface DeliveryNotePdfProps {
  deliveryNo: string;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  receivedBy: string;
  receiverPhone?: string;
  deliveryDate: string;
  deliveryMode: string;
  companyName: string;
  companyPhone: string;
  companyAddress: string;
  remarks: string;
  footerText?: string;
  items: Array<{
    pieceNo: string;
    category: string;
    description: string;
    metal: string;
    purity: string;
    finalWeightMg: number;
  }>;
}

export const DeliveryNotePdfDocument: React.FC<DeliveryNotePdfProps> = ({
  deliveryNo,
  orderNo,
  customerName,
  customerPhone,
  receivedBy,
  receiverPhone,
  deliveryDate,
  deliveryMode,
  companyName,
  companyPhone,
  companyAddress,
  remarks,
  footerText,
  items,
}) => {
  const totalDeliveredMg = items.reduce(
    (acc, it) => acc + (it.finalWeightMg || 0),
    0
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={styles.tagline}>Official Customer Delivery & Handover Note</Text>
            <Text style={styles.tagline}>{companyAddress} | {companyPhone}</Text>
          </View>
          <View style={styles.docTitleBlock}>
            <Text style={styles.docTitle}>DELIVERY NOTE</Text>
            <Text style={styles.docNumber}>{deliveryNo}</Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaCol}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Customer Name:</Text>
              <Text style={styles.metaValue}>{customerName}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Customer Phone:</Text>
              <Text style={styles.metaValue}>{customerPhone}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Order Reference:</Text>
              <Text style={styles.metaValue}>{orderNo}</Text>
            </View>
          </View>
          <View style={styles.metaCol}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Delivery Date:</Text>
              <Text style={styles.metaValue}>{deliveryDate}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Received By:</Text>
              <Text style={styles.metaValue}>{receivedBy} {receiverPhone ? `(${receiverPhone})` : ""}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Handover Mode:</Text>
              <Text style={styles.metaValue}>{deliveryMode}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNum}>#</Text>
            <Text style={styles.colPiece}>Piece Ref & Description</Text>
            <Text style={styles.colCategory}>Category</Text>
            <Text style={styles.colMetal}>Metal & Purity</Text>
            <Text style={styles.colFinalWt}>Certified Net/Gross Wt</Text>
          </View>

          {items.map((it, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.colNum}>{idx + 1}</Text>
              <View style={styles.colPiece}>
                <Text style={{ fontWeight: "bold" }}>{it.pieceNo}</Text>
                <Text style={{ color: "#666", fontSize: 8 }}>{it.description}</Text>
              </View>
              <Text style={styles.colCategory}>{it.category}</Text>
              <Text style={styles.colMetal}>{it.metal} {it.purity}</Text>
              <Text style={styles.colFinalWt}>{formatWeight(it.finalWeightMg)}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 15 }}>
          <Text style={{ fontWeight: "bold", fontSize: 10, color: "#065f46" }}>
            Total Delivered Weight: {formatWeight(totalDeliveredMg)}
          </Text>
        </View>

        {remarks && (
          <View style={{ padding: 8, backgroundColor: "#ecfdf5", borderLeftWidth: 3, borderLeftColor: "#059669" }}>
            <Text style={{ fontWeight: "bold", color: "#065f46" }}>Handover Remarks:</Text>
            <Text>{remarks}</Text>
          </View>
        )}

        <View style={styles.signatures}>
          <View style={styles.sigBlock}>
            <Text>Customer / Receiver Signature</Text>
            <Text style={{ fontSize: 7, color: "#888", marginTop: 2 }}>Received above jewellery pieces in perfect condition</Text>
          </View>
          <View style={styles.sigBlock}>
            <Text>Authorized Showroom Manager</Text>
            <Text style={{ fontSize: 7, color: "#888", marginTop: 2 }}>Handover verified & certified</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>{footerText || "BMS Jewellery — Customer Delivery Note"}</Text>
        </View>
      </Page>
    </Document>
  );
};
