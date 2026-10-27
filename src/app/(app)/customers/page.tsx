import * as React from "react";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { Order } from "@/models/Order";
import { CustomerListClient } from "@/components/customers/CustomerListClient";


export default async function CustomersPage() {
  await connectDB();
  const customers = await Customer.find({ isDeleted: false })
    .sort({ createdAt: -1 })
    .lean();

  const customerRows = await Promise.all(
    customers.map(async (c) => {
      const ordersCount = await Order.countDocuments({
        customerId: c._id,
        isDeleted: false,
      });

      return {
        id: c._id.toString(),
        code: c.code,
        name: c.name,
        phone: c.phone,
        email: c.email || "",
        city: c.city || "",
        gstin: c.gstin || "",
        notes: c.notes || "",
        ordersCount,
        createdAt: c.createdAt,
      };
    })
  );

  return <CustomerListClient initialCustomers={customerRows} />;
}
