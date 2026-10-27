"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { createUserSchema, CreateUserInput } from "@/schemas/auth";
import { logActivity } from "@/lib/audit";
import { ActionResult } from "@/types/actions";
import bcrypt from "bcryptjs";

export async function createUser(
  input: CreateUserInput
): Promise<ActionResult<{ userId: string }>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { ok: false, error: "Unauthorized." };
    }

    if (!hasPermission((session.user as any).role, "users:manage")) {
      return { ok: false, error: "Permission denied. Only OWNER can manage users." };
    }

    const parsed = createUserSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await connectDB();

    const existing = await User.findOne({
      phone: parsed.data.phone,
      isDeleted: false,
    });
    if (existing) {
      return { ok: false, error: "A user with this phone number already exists." };
    }

    let passwordHash: string | undefined;
    let pinHash: string | undefined;

    if (parsed.data.role === "KARIGAR") {
      if (!parsed.data.pin) {
        return { ok: false, error: "PIN is required for Karigar accounts." };
      }
      pinHash = await bcrypt.hash(parsed.data.pin, 10);
    } else {
      if (!parsed.data.password) {
        return { ok: false, error: "Password is required for Staff accounts." };
      }
      passwordHash = await bcrypt.hash(parsed.data.password, 10);
    }

    const user = await User.create({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || undefined,
      role: parsed.data.role,
      passwordHash,
      pinHash,
      artisanId: parsed.data.artisanId || undefined,
      isActive: parsed.data.isActive ?? true,
      createdBy: session.user.id,
    });

    await logActivity({
      entityType: "SETTINGS",
      entityId: user._id.toString(),
      action: "USER_CREATED",
      remarks: `User ${user.name} (${user.role}) created`,
      userId: session.user.id,
      userName: session.user.name || "Owner",
      userRole: "OWNER",
    });

    revalidatePath("/settings");
    return {
      ok: true,
      data: { userId: user._id.toString() },
      message: `User ${user.name} created successfully.`,
    };
  } catch (error: any) {
    console.error("createUser error:", error);
    return { ok: false, error: error.message || "Failed to create user" };
  }
}

export async function resetUserCredentials(
  userId: string,
  credentials: { password?: string; pin?: string }
): Promise<ActionResult<void>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { ok: false, error: "Unauthorized." };
    }

    if (!hasPermission((session.user as any).role, "users:manage")) {
      return { ok: false, error: "Permission denied." };
    }

    await connectDB();
    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      return { ok: false, error: "User not found." };
    }

    if (user.role === "KARIGAR") {
      if (!credentials.pin) {
        return { ok: false, error: "New PIN is required." };
      }
      user.pinHash = await bcrypt.hash(credentials.pin, 10);
      user.failedPinAttempts = 0;
      user.pinLockedUntil = null;
    } else {
      if (!credentials.password) {
        return { ok: false, error: "New password is required." };
      }
      user.passwordHash = await bcrypt.hash(credentials.password, 10);
    }

    user.updatedBy = session.user.id as any;
    await user.save();

    revalidatePath("/settings");
    return { ok: true, data: undefined, message: "Credentials reset successfully." };
  } catch (error: any) {
    console.error("resetUserCredentials error:", error);
    return { ok: false, error: error.message || "Failed to reset credentials" };
  }
}

export async function toggleUserStatus(
  userId: string,
  isActive: boolean
): Promise<ActionResult<void>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { ok: false, error: "Unauthorized." };
    }

    if (!hasPermission((session.user as any).role, "users:manage")) {
      return { ok: false, error: "Permission denied." };
    }

    await connectDB();
    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      return { ok: false, error: "User not found." };
    }

    user.isActive = isActive;
    user.updatedBy = session.user.id as any;
    await user.save();

    revalidatePath("/settings");
    return {
      ok: true,
      data: undefined,
      message: `User ${user.name} is now ${isActive ? "active" : "inactive"}.`,
    };
  } catch (error: any) {
    console.error("toggleUserStatus error:", error);
    return { ok: false, error: error.message || "Failed to update user status" };
  }
}
