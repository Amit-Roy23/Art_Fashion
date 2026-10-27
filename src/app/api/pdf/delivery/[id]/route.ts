import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { connectDB } from "@/lib/db";
import { Delivery } from "@/models/Delivery";
import { Settings } from "@/models/Settings";
import { DeliveryNotePdfDocument } from "@/pdf/DeliveryNotePdf";
import { formatISTDate } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const delivery = await Delivery.findById(id)
      .populate("customerId")
      .populate("orderId")
      .populate("items.orderItemId")
      .lean();

    if (!delivery) {
      return NextResponse.json({ error: "Delivery record not found" }, { status: 404 });
    }

    const settings = await Settings.findOne().lean();

    const pdfData = {
      deliveryNo: delivery.deliveryNo,
      orderNo: (delivery.orderId as any)?.orderNo || "Order",
      customerName: (delivery.customerId as any)?.name || "Customer",
      customerPhone: (delivery.customerId as any)?.phone || "",
      receivedBy: delivery.receivedBy,
      receiverPhone: delivery.receiverPhone,
      deliveryDate: formatISTDate(delivery.deliveryDate),
      deliveryMode: delivery.mode,
      companyName: settings?.companyName || "BMS Fine Jewellery Manufacturers",
      companyPhone: settings?.phone || "+91 98200 12345",
      companyAddress: settings?.address || "Mumbai, India",
      remarks: delivery.remarks || "",
      footerText: settings?.pdfFooterText,
      items: delivery.items.map((item: any) => ({
        pieceNo: item.orderItemId?.pieceNo || "Piece",
        category: item.orderItemId?.category || "Jewellery",
        description: item.orderItemId?.description || "",
        metal: item.orderItemId?.metal || "Gold",
        purity: item.orderItemId?.purity || "22K",
        finalWeightMg: item.finalWeightMg || 0,
      })),
    };

    const buffer = await renderToBuffer(
      React.createElement(DeliveryNotePdfDocument, pdfData) as any
    );

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${delivery.deliveryNo}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Delivery PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate Delivery Note PDF" },
      { status: 500 }
    );
  }
}
