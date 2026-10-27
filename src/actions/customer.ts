"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { customerSchema, CustomerInput } from "@/schemas/customer";
import { getNextSequenceNumber } from "@/lib/numbering";
import { logActivity } from "@/lib/audit";
import { ActionResult } from "@/types/actions";

export async function createCustomer(
  input: CustomerInput
): Promise<ActionResult<{ id: string; code: string }>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { ok: false, error: "Unauthorized. Please log in." };
    }

    if (!hasPermission((session.user as any).role, "customers:manage")) {
      return { ok: false, error: "Permission denied." };
    }

    const parsed = customerSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await connectDB();
    const code = await getNextSequenceNumber("CUSTOMER");

    const customer = await Customer.create({
      code,
      name: parsed.data.name,
      phone: parsed.data.phone,
      altPhone: parsed.data.altPhone,
      email: parsed.data.email,
      address: parsed.data.address,
      city: parsed.data.city,
      gstin: parsed.data.gstin,
      notes: parsed.data.notes,
      photos: parsed.data.photos,
      createdBy: session.user.id,
    });

    await logActivity({
      entityType: "CUSTOMER",
      entityId: customer._id.toString(),
      action: "CREATED",
      remarks: `Customer ${customer.name} (${code}) added`,
      userId: session.user.id,
      userName: session.user.name || "Staff",
      userRole: (session.user as any).role,
    });

    revalidatePath("/customers");
    return {
      ok: true,
      data: { id: customer._id.toString(), code },
      message: `Customer ${customer.name} created successfully`,
    };
  } catch (error: any) {
    console.error("createCustomer error:", error);
    return { ok: false, error: error.message || "Failed to create customer" };
  }
}

export async function updateCustomer(
  id: string,
  input: CustomerInput
): Promise<ActionResult<void>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { ok: false, error: "Unauthorized." };
    }

    if (!hasPermission((session.user as any).role, "customers:manage")) {
      return { ok: false, error: "Permission denied." };
    }

    const parsed = customerSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await connectDB();
    const customer = await Customer.findById(id);
    if (!customer || customer.isDeleted) {
      return { ok: false, error: "Customer not found." };
    }

    customer.name = parsed.data.name;
    customer.phone = parsed.data.phone;
    customer.altPhone = parsed.data.altPhone;
    customer.email = parsed.data.email;
    customer.address = parsed.data.address;
    customer.city = parsed.data.city;
    customer.gstin = parsed.data.gstin;
    customer.notes = parsed.data.notes;
    if (parsed.data.photos) {
      customer.photos = parsed.data.photos as any;
    }
    customer.updatedBy = session.user.id as any;
    await customer.save();

    await logActivity({
      entityType: "CUSTOMER",
      entityId: id,
      action: "UPDATED",
      remarks: `Updated details for customer ${customer.name}`,
      userId: session.user.id,
      userName: session.user.name || "Staff",
      userRole: (session.user as any).role,
    });

    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return { ok: true, data: undefined, message: "Customer updated" };
  } catch (error: any) {
    console.error("updateCustomer error:", error);
    return { ok: false, error: error.message || "Failed to update customer" };
  }
}
