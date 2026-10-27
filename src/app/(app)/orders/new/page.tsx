import * as React from "react";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { Settings } from "@/models/Settings";
import { CreateOrderWizard } from "@/components/orders/CreateOrderWizard";


export default async function NewOrderPage() {
  await connectDB();

  const [customers, settings] = await Promise.all([
    Customer.find({ isDeleted: false }).sort({ name: 1 }).lean(),
    Settings.findOne().lean(),
  ]);

  const customerOptions = customers.map((c) => ({
    id: c._id.toString(),
    code: c.code,
    name: c.name,
    phone: c.phone,
    city: c.city || "",
  }));

  const categories = settings?.categories || [
    "Ring",
    "Necklace",
    "Earrings",
    "Bangles",
    "Bracelet",
    "Pendant",
    "Chain",
    "Mangalsutra",
  ];

  const purities = settings?.purities || [
    "22K (916)",
    "18K (750)",
    "14K (585)",
    "24K (999)",
    "925 Sterling Silver",
    "Platinum 950",
  ];

  return (
    <CreateOrderWizard
      customers={customerOptions}
      categories={categories}
      purities={purities}
    />
  );
}
