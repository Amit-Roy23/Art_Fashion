import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { OrderItem } from "@/models/OrderItem";
import { Customer } from "@/models/Customer";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    await connectDB();
    const regex = new RegExp(q, "i");

    const [orders, pieces, customers] = await Promise.all([
      Order.find({
        $or: [{ orderNo: regex }, { projectName: regex }],
        isDeleted: false,
      })
        .limit(5)
        .lean(),
      OrderItem.find({
        $or: [{ pieceNo: regex }, { description: regex }, { category: regex }],
        isDeleted: false,
      })
        .limit(5)
        .lean(),
      Customer.find({
        $or: [{ name: regex }, { phone: regex }, { code: regex }],
        isDeleted: false,
      })
        .limit(5)
        .lean(),
    ]);

    const results = [
      ...orders.map((o) => ({
        type: "ORDER" as const,
        id: o._id.toString(),
        title: `${o.orderNo} — ${o.type === "PROJECT" ? o.projectName : "Piece Order"}`,
        subtitle: `Status: ${o.systemStatus} | ${o.itemCount} piece(s)`,
        url: `/orders/${o._id.toString()}`,
      })),
      ...pieces.map((p) => ({
        type: "PIECE" as const,
        id: p._id.toString(),
        title: `${p.pieceNo} — ${p.category}`,
        subtitle: `${p.description} (${p.currentLocation})`,
        url: `/pieces/${p._id.toString()}`,
      })),
      ...customers.map((c) => ({
        type: "CUSTOMER" as const,
        id: c._id.toString(),
        title: `${c.name} (${c.code})`,
        subtitle: `Phone: ${c.phone} | ${c.city || "India"}`,
        url: `/customers/${c._id.toString()}`,
      })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Global search API error:", error);
    return NextResponse.json({ results: [] });
  }
}
