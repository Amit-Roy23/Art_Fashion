"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { hasPermission, PermissionMatrix } from "@/lib/rbac";
import { connectDB } from "@/lib/db";
import { Settings } from "@/models/Settings";
import { ProductionStage } from "@/models/ProductionStage";
import { StatusOption } from "@/models/StatusOption";
import {
  companySettingsSchema,
  CompanySettingsInput,
  stageSchema,
  StageInput,
  statusOptionSchema,
  StatusOptionInput,
} from "@/schemas/settings";
import { logActivity } from "@/lib/audit";
import { ActionResult } from "@/types/actions";

export async function updateCompanySettings(
  input: CompanySettingsInput
): Promise<ActionResult<void>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { ok: false, error: "Unauthorized." };
    }

    if (!hasPermission((session.user as any).role, "settings:manage")) {
      return { ok: false, error: "Permission denied. OWNER required." };
    }

    const parsed = companySettingsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await connectDB();
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    settings.companyName = parsed.data.companyName;
    settings.tagline = parsed.data.tagline;
    settings.logoUrl = parsed.data.logoUrl;
    settings.address = parsed.data.address;
    settings.city = parsed.data.city;
    settings.phone = parsed.data.phone;
    settings.email = parsed.data.email;
    settings.gstin = parsed.data.gstin;
    settings.weightTolerancePercent = parsed.data.weightTolerancePercent;
    settings.pdfFooterText = parsed.data.pdfFooterText;
    settings.photoRequired = parsed.data.photoRequired as any;
    settings.categories = parsed.data.categories;
    settings.purities = parsed.data.purities;
    settings.processTypes = parsed.data.processTypes;
    settings.updatedBy = session.user.id as any;
    await settings.save();

    await logActivity({
      entityType: "SETTINGS",
      entityId: settings._id.toString(),
      action: "UPDATED",
      remarks: "Company profile, masters, and photo requirements updated",
      userId: session.user.id,
      userName: session.user.name || "Owner",
      userRole: (session.user as any).role,
    });

    revalidatePath("/settings");
    return { ok: true, data: undefined, message: "Settings saved successfully." };
  } catch (error: any) {
    console.error("updateCompanySettings error:", error);
    return { ok: false, error: error.message || "Failed to update settings" };
  }
}

export async function upsertStage(
  input: StageInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { ok: false, error: "Unauthorized." };
    }

    if (!hasPermission((session.user as any).role, "settings:manage")) {
      return { ok: false, error: "Permission denied." };
    }

    const parsed = stageSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await connectDB();
    if (parsed.data.id) {
      const stage = await ProductionStage.findById(parsed.data.id);
      if (!stage) return { ok: false, error: "Stage not found." };
      stage.name = parsed.data.name;
      stage.sortOrder = parsed.data.sortOrder;
      stage.colour = parsed.data.colour;
      stage.requiresPhoto = parsed.data.requiresPhoto;
      stage.requiresWeight = parsed.data.requiresWeight;
      stage.isActive = parsed.data.isActive;
      stage.updatedBy = session.user.id as any;
      await stage.save();
      revalidatePath("/settings");
      return { ok: true, data: { id: stage._id.toString() }, message: "Stage updated." };
    } else {
      const stage = await ProductionStage.create({
        name: parsed.data.name,
        sortOrder: parsed.data.sortOrder,
        colour: parsed.data.colour,
        requiresPhoto: parsed.data.requiresPhoto,
        requiresWeight: parsed.data.requiresWeight,
        isActive: parsed.data.isActive,
        createdBy: session.user.id,
      });
      revalidatePath("/settings");
      return { ok: true, data: { id: stage._id.toString() }, message: "Stage created." };
    }
  } catch (error: any) {
    console.error("upsertStage error:", error);
    return { ok: false, error: error.message || "Failed to save stage" };
  }
}

export async function upsertStatusOption(
  input: StatusOptionInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { ok: false, error: "Unauthorized." };
    }

    if (!hasPermission((session.user as any).role, "settings:manage")) {
      return { ok: false, error: "Permission denied." };
    }

    const parsed = statusOptionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await connectDB();
    if (parsed.data.id) {
      const status = await StatusOption.findById(parsed.data.id);
      if (!status) return { ok: false, error: "Status option not found." };
      status.scope = parsed.data.scope;
      status.name = parsed.data.name;
      status.colour = parsed.data.colour;
      status.systemCategory = parsed.data.systemCategory;
      status.sortOrder = parsed.data.sortOrder;
      status.isDefault = parsed.data.isDefault;
      status.isActive = parsed.data.isActive;
      status.updatedBy = session.user.id as any;
      await status.save();
      revalidatePath("/settings");
      return { ok: true, data: { id: status._id.toString() }, message: "Status option updated." };
    } else {
      const status = await StatusOption.create({
        scope: parsed.data.scope,
        name: parsed.data.name,
        colour: parsed.data.colour,
        systemCategory: parsed.data.systemCategory,
        sortOrder: parsed.data.sortOrder,
        isDefault: parsed.data.isDefault,
        isActive: parsed.data.isActive,
        createdBy: session.user.id,
      });
      revalidatePath("/settings");
      return { ok: true, data: { id: status._id.toString() }, message: "Status option created." };
    }
  } catch (error: any) {
    console.error("upsertStatusOption error:", error);
    return { ok: false, error: error.message || "Failed to save status option" };
  }
}

export async function updatePermissionMatrix(
  matrix: PermissionMatrix
): Promise<ActionResult<void>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { ok: false, error: "Unauthorized." };
    }

    if ((session.user as any).role !== "OWNER") {
      return { ok: false, error: "Only OWNER can edit the RBAC permission matrix." };
    }

    await connectDB();
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    settings.permissionMatrix = matrix;
    settings.updatedBy = session.user.id as any;
    await settings.save();

    await logActivity({
      entityType: "SETTINGS",
      entityId: settings._id.toString(),
      action: "UPDATED",
      remarks: "RBAC Permission Matrix updated",
      userId: session.user.id,
      userName: session.user.name || "Owner",
      userRole: "OWNER",
    });

    revalidatePath("/settings");
    return { ok: true, data: undefined, message: "Permission matrix saved." };
  } catch (error: any) {
    console.error("updatePermissionMatrix error:", error);
    return { ok: false, error: error.message || "Failed to save permissions" };
  }
}
