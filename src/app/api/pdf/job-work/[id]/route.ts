import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { connectDB } from "@/lib/db";
import { JobWork } from "@/models/JobWork";
import { Settings } from "@/models/Settings";
import { JobWorkChallanPdfDocument } from "@/pdf/JobWorkChallanPdf";
import { formatISTDate } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const jobWork = await JobWork.findById(id)
      .populate("vendorId")
      .populate("items.orderItemId")
      .lean();

    if (!jobWork) {
      return NextResponse.json({ error: "Job Work Challan not found" }, { status: 404 });
    }

    const settings = await Settings.findOne().lean();

    const pdfData = {
      challanNo: jobWork.challanNo,
      vendorName: (jobWork.vendorId as any)?.name || "Job Work Vendor",
      vendorPhone: (jobWork.vendorId as any)?.phone || "",
      processType: jobWork.processType,
      dispatchDate: formatISTDate(jobWork.dispatchDate),
      expectedReturnDate: formatISTDate(jobWork.expectedReturnDate),
      companyName: settings?.companyName || "BMS Fine Jewellery Manufacturers",
      companyPhone: settings?.phone || "+91 98200 12345",
      companyAddress: settings?.address || "Mumbai, India",
      remarks: jobWork.remarks || "",
      footerText: settings?.pdfFooterText,
      items: jobWork.items.map((item: any) => ({
        pieceNo: item.orderItemId?.pieceNo || "Piece",
        category: item.orderItemId?.category || "Jewellery",
        description: item.orderItemId?.description || "",
        sentWeightMg: item.sentWeightMg || 0,
        status: item.status || "SENT",
      })),
    };

    const buffer = await renderToBuffer(
      React.createElement(JobWorkChallanPdfDocument, pdfData) as any
    );

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${jobWork.challanNo}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Job Work PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate Job Work PDF" },
      { status: 500 }
    );
  }
}
