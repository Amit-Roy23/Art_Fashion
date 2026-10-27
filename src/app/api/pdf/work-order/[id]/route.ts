import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { connectDB } from "@/lib/db";
import { Assignment } from "@/models/Assignment";
import { Settings } from "@/models/Settings";
import { WorkOrderPdfDocument } from "@/pdf/WorkOrderPdf";
import { formatISTDate } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const assignment = await Assignment.findById(id)
      .populate("artisanId")
      .populate({
        path: "items.orderItemId",
        populate: { path: "orderId" },
      })
      .populate("items.stageId")
      .populate("issuedBy")
      .lean();

    if (!assignment) {
      return NextResponse.json({ error: "Work Order not found" }, { status: 404 });
    }

    const settings = await Settings.findOne().lean();

    const pdfData = {
      workOrderNo: assignment.workOrderNo,
      issueDate: formatISTDate(assignment.issueDate),
      dueDate: formatISTDate(assignment.dueDate),
      artisanName: (assignment.artisanId as any)?.name || "Artisan",
      artisanPhone: (assignment.artisanId as any)?.phone || "",
      artisanCode: (assignment.artisanId as any)?.code || "KAR",
      issuedByName: (assignment.issuedBy as any)?.name || "Supervisor",
      companyName: settings?.companyName || "BMS Fine Jewellery Manufacturers",
      companyPhone: settings?.phone || "+91 98200 12345",
      companyAddress: settings?.address || "Mumbai, India",
      remarks: assignment.remarks || "",
      footerText: settings?.pdfFooterText,
      items: assignment.items.map((item: any) => {
        const piece = item.orderItemId;
        const photoUrl = piece?.photos?.[0]?.url;
        return {
          pieceNo: piece?.pieceNo || "Piece",
          category: piece?.category || "Jewellery",
          description: piece?.description || "",
          metal: piece?.metal || "Gold",
          purity: piece?.purity || "22K",
          issuedWeightMg: item.issuedWeightMg || 0,
          stageName: item.stageId?.name || "Stage",
          instructions: item.instructions || "",
          photoUrl: photoUrl && photoUrl.startsWith("http") ? photoUrl : undefined,
        };
      }),
    };

    const buffer = await renderToBuffer(
      React.createElement(WorkOrderPdfDocument, pdfData) as any
    );

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${assignment.workOrderNo}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF document" },
      { status: 500 }
    );
  }
}
