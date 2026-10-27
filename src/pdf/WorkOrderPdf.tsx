import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
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
    borderBottomColor: "#d4af37",
    paddingBottom: 10,
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  companyName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#996515",
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
    color: "#b8860b",
    marginTop: 3,
  },
  metaGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fcfbf8",
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 15,
  },
  metaCol: {
    width: "48%",
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  metaLabel: {
    width: 80,
    fontWeight: "bold",
    color: "#555",
  },
  metaValue: {
    flex: 1,
    color: "#111",
  },
  table: {
    width: "100%",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f3ef",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    fontWeight: "bold",
    padding: 6,
    color: "#444",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    padding: 6,
    alignItems: "center",
  },
  colPhoto: { width: "15%" },
  colPiece: { width: "25%" },
  colSpecs: { width: "30%" },
  colWeight: { width: "15%", textAlign: "right" },
  colStage: { width: "15%", textAlign: "right" },
  thumb: {
    width: 40,
    height: 40,
    objectFit: "cover",
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  instructionsBox: {
    padding: 8,
    backgroundColor: "#fffdf9",
    borderLeftWidth: 3,
    borderLeftColor: "#d4af37",
    marginBottom: 25,
  },
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
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 5,
  },
});

export interface WorkOrderPdfProps {
  workOrderNo: string;
  issueDate: string;
  dueDate: string;
  artisanName: string;
  artisanPhone: string;
  artisanCode: string;
  issuedByName: string;
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
    issuedWeightMg: number;
    stageName: string;
    instructions?: string;
    photoUrl?: string;
  }>;
}

export const WorkOrderPdfDocument: React.FC<WorkOrderPdfProps> = ({
  workOrderNo,
  issueDate,
  dueDate,
  artisanName,
  artisanPhone,
  artisanCode,
  issuedByName,
  companyName,
  companyPhone,
  companyAddress,
  remarks,
  footerText,
  items,
}) => {
  const totalIssuedMg = items.reduce((acc, it) => acc + (it.issuedWeightMg || 0), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={styles.tagline}>Fine Jewellery Manufacturing & Karigar Work Order</Text>
            <Text style={styles.tagline}>{companyAddress} | {companyPhone}</Text>
          </View>
          <View style={styles.docTitleBlock}>
            <Text style={styles.docTitle}>WORK ORDER</Text>
            <Text style={styles.docNumber}>{workOrderNo}</Text>
          </View>
        </View>

        {/* Meta details */}
        <View style={styles.metaGrid}>
          <View style={styles.metaCol}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Karigar (Artisan):</Text>
              <Text style={styles.metaValue}>{artisanName} ({artisanCode})</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Phone:</Text>
              <Text style={styles.metaValue}>{artisanPhone}</Text>
            </View>
          </View>
          <View style={styles.metaCol}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Issue Date:</Text>
              <Text style={styles.metaValue}>{issueDate}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due Date:</Text>
              <Text style={styles.metaValue}>{dueDate}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Issued By:</Text>
              <Text style={styles.metaValue}>{issuedByName}</Text>
            </View>
          </View>
        </View>

        {/* Pieces Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colPhoto}>Design</Text>
            <Text style={styles.colPiece}>Piece Ref & Type</Text>
            <Text style={styles.colSpecs}>Metal / Purity / Instructions</Text>
            <Text style={styles.colWeight}>Issued Weight</Text>
            <Text style={styles.colStage}>Target Stage</Text>
          </View>

          {items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <View style={styles.colPhoto}>
                {item.photoUrl ? (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image src={item.photoUrl} style={styles.thumb} />
                ) : (
                  <Text style={{ fontSize: 7, color: "#999" }}>No photo</Text>
                )}
              </View>
              <View style={styles.colPiece}>
                <Text style={{ fontWeight: "bold" }}>{item.pieceNo}</Text>
                <Text style={{ color: "#555" }}>{item.category}</Text>
                <Text style={{ fontSize: 8, color: "#666" }}>{item.description}</Text>
              </View>
              <View style={styles.colSpecs}>
                <Text>{item.metal} - {item.purity}</Text>
                {item.instructions ? (
                  <Text style={{ fontSize: 8, color: "#854d0e", marginTop: 2 }}>
                    Note: {item.instructions}
                  </Text>
                ) : null}
              </View>
              <View style={styles.colWeight}>
                <Text style={{ fontWeight: "bold" }}>{formatWeight(item.issuedWeightMg)}</Text>
              </View>
              <View style={styles.colStage}>
                <Text>{item.stageName}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Total Issued Weight */}
        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 15, paddingRight: 10 }}>
          <Text style={{ fontWeight: "bold", fontSize: 10 }}>
            Total Issued Weight: {formatWeight(totalIssuedMg)}
          </Text>
        </View>

        {/* Overall remarks */}
        {remarks && (
          <View style={styles.instructionsBox}>
            <Text style={{ fontWeight: "bold", color: "#854d0e", marginBottom: 2 }}>
              General Instructions / Remarks:
            </Text>
            <Text>{remarks}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signatures}>
          <View style={styles.sigBlock}>
            <Text>Artisan Signature (Receiver)</Text>
            <Text style={{ fontSize: 7, color: "#888", marginTop: 2 }}>I confirm receipt of materials & weights</Text>
          </View>
          <View style={styles.sigBlock}>
            <Text>Authorized Workshop Supervisor</Text>
            <Text style={{ fontSize: 7, color: "#888", marginTop: 2 }}>Production Manager / Issuer</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>{footerText || "BMS Jewellery Order & Production Manager — Internal Production Record"}</Text>
        </View>
      </Page>
    </Document>
  );
};
