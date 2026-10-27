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
    borderBottomColor: "#7c3aed",
    paddingBottom: 10,
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  companyName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#5b21b6",
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
    color: "#7c3aed",
    marginTop: 3,
  },
  metaGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#faf5ff",
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e9d5ff",
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
    backgroundColor: "#f3e8ff",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    fontWeight: "bold",
    padding: 6,
    color: "#4c1d95",
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
  colSentWt: { width: "20%", textAlign: "right" },
  colStatus: { width: "20%", textAlign: "right" },
  signatures: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40,
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

export interface JobWorkChallanPdfProps {
  challanNo: string;
  vendorName: string;
  vendorPhone: string;
  processType: string;
  dispatchDate: string;
  expectedReturnDate: string;
  companyName: string;
  companyPhone: string;
  companyAddress: string;
  remarks: string;
  footerText?: string;
  items: Array<{
    pieceNo: string;
    category: string;
    description: string;
    sentWeightMg: number;
    status: string;
  }>;
}

export const JobWorkChallanPdfDocument: React.FC<JobWorkChallanPdfProps> = ({
  challanNo,
  vendorName,
  vendorPhone,
  processType,
  dispatchDate,
  expectedReturnDate,
  companyName,
  companyPhone,
  companyAddress,
  remarks,
  footerText,
  items,
}) => {
  const totalSentMg = items.reduce((acc, it) => acc + (it.sentWeightMg || 0), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={styles.tagline}>Outside Job Work / Finishing Issue Challan</Text>
            <Text style={styles.tagline}>{companyAddress} | {companyPhone}</Text>
          </View>
          <View style={styles.docTitleBlock}>
            <Text style={styles.docTitle}>JOB WORK CHALLAN</Text>
            <Text style={styles.docNumber}>{challanNo}</Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaCol}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Vendor Name:</Text>
              <Text style={styles.metaValue}>{vendorName}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Vendor Phone:</Text>
              <Text style={styles.metaValue}>{vendorPhone}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Process Type:</Text>
              <Text style={styles.metaValue}>{processType}</Text>
            </View>
          </View>
          <View style={styles.metaCol}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Dispatch Date:</Text>
              <Text style={styles.metaValue}>{dispatchDate}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Expected Return:</Text>
              <Text style={styles.metaValue}>{expectedReturnDate}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNum}>#</Text>
            <Text style={styles.colPiece}>Piece Identifier & Details</Text>
            <Text style={styles.colCategory}>Category</Text>
            <Text style={styles.colSentWt}>Dispatched Weight</Text>
            <Text style={styles.colStatus}>Status</Text>
          </View>

          {items.map((it, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.colNum}>{idx + 1}</Text>
              <View style={styles.colPiece}>
                <Text style={{ fontWeight: "bold" }}>{it.pieceNo}</Text>
                <Text style={{ color: "#666", fontSize: 8 }}>{it.description}</Text>
              </View>
              <Text style={styles.colCategory}>{it.category}</Text>
              <Text style={styles.colSentWt}>{formatWeight(it.sentWeightMg)}</Text>
              <Text style={styles.colStatus}>{it.status}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 15 }}>
          <Text style={{ fontWeight: "bold", fontSize: 10 }}>
            Total Dispatched Weight: {formatWeight(totalSentMg)}
          </Text>
        </View>

        {remarks && (
          <View style={{ padding: 8, backgroundColor: "#faf5ff", borderLeftWidth: 3, borderLeftColor: "#7c3aed" }}>
            <Text style={{ fontWeight: "bold", color: "#5b21b6" }}>Instructions:</Text>
            <Text>{remarks}</Text>
          </View>
        )}

        <View style={styles.signatures}>
          <View style={styles.sigBlock}>
            <Text>Vendor Receiver Signature</Text>
            <Text style={{ fontSize: 7, color: "#888", marginTop: 2 }}>Accepted with agreed gross weight</Text>
          </View>
          <View style={styles.sigBlock}>
            <Text>Dispatch Authorized By</Text>
            <Text style={{ fontSize: 7, color: "#888", marginTop: 2 }}>Workshop Supervisor</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>{footerText || "BMS Jewellery — Job Work Dispatch Challan"}</Text>
        </View>
      </Page>
    </Document>
  );
};
