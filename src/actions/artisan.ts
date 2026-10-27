"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { connectDB } from "@/lib/db";
import { Artisan } from "@/models/Artisan";
import { User } from "@/models/User";
import { OrderItem } from "@/models/OrderItem";
import { ProgressUpdate } from "@/models/ProgressUpdate";
import { artisanSchema, ArtisanInput } from "@/schemas/artisan";
import { getNextSequenceNumber } from "@/lib/numbering";
import { logActivity } from "@/lib/audit";
import { ActionResult } from "@/types/actions";
import bcrypt from "bcryptjs";

export async function createArtisan(
  input: ArtisanInput
): Promise<ActionResult<{ id: string; code: string }>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { ok: false, error: "Unauthorized." };
    }

    if (!hasPermission((session.user as any).role, "artisans:manage")) {
      return { ok: false, error: "Permission denied." };
    }

    const parsed = artisanSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await connectDB();
    const code = await getNextSequenceNumber("ARTISAN");

    const artisan = await Artisan.create({
      code,
      name: parsed.data.name,
      phone: parsed.data.phone,
      address: parsed.data.address,
      speciality: parsed.data.speciality,
      photo: parsed.data.photo,
      idProof: parsed.data.idProof || [],
      notes: parsed.data.notes,
      createdBy: session.user.id,
    });

    // If PIN provided, create User account for karigar mobile portal
    if (parsed.data.pin) {
      const pinHash = await bcrypt.hash(parsed.data.pin, 10);
      const user = await User.create({
        name: parsed.data.name,
        phone: parsed.data.phone,
        pinHash,
        role: "KARIGAR",
        artisanId: artisan._id,
        isActive: true,
        createdBy: session.user.id,
      });

      artisan.userId = user._id as any;
      await artisan.save();
    }

    await logActivity({
      entityType: "ARTISAN",
      entityId: artisan._id.toString(),
      action: "CREATED",
      remarks: `Artisan ${artisan.name} (${code}) added with ${parsed.data.speciality.join(", ")}`,
      userId: session.user.id,
      userName: session.user.name || "Staff",
      userRole: (session.user as any).role,
    });

    revalidatePath("/artisans");
    return {
      ok: true,
      data: { id: artisan._id.toString(), code },
      message: `Artisan ${artisan.name} (${code}) created successfully`,
    };
  } catch (error: any) {
    console.error("createArtisan error:", error);
    return { ok: false, error: error.message || "Failed to create artisan" };
  }
}

export async function updateArtisan(
  id: string,
  input: ArtisanInput
): Promise<ActionResult<void>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { ok: false, error: "Unauthorized." };
    }

    if (!hasPermission((session.user as any).role, "artisans:manage")) {
      return { ok: false, error: "Permission denied." };
    }

    const parsed = artisanSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await connectDB();
    const artisan = await Artisan.findById(id);
    if (!artisan || artisan.isDeleted) {
      return { ok: false, error: "Artisan not found." };
    }

    artisan.name = parsed.data.name;
    artisan.phone = parsed.data.phone;
    artisan.address = parsed.data.address;
    artisan.speciality = parsed.data.speciality;
    if (parsed.data.photo) artisan.photo = parsed.data.photo as any;
    if (parsed.data.idProof) artisan.idProof = parsed.data.idProof as any;
    artisan.notes = parsed.data.notes;
    artisan.updatedBy = session.user.id as any;
    await artisan.save();

    // If PIN update is requested
    if (parsed.data.pin) {
      const pinHash = await bcrypt.hash(parsed.data.pin, 10);
      let user = await User.findOne({ artisanId: artisan._id });
      if (user) {
        user.pinHash = pinHash;
        user.phone = parsed.data.phone;
        user.name = parsed.data.name;
        user.failedPinAttempts = 0;
        user.pinLockedUntil = null;
        await user.save();
      } else {
        user = await User.create({
          name: parsed.data.name,
          phone: parsed.data.phone,
          pinHash,
          role: "KARIGAR",
          artisanId: artisan._id,
          isActive: true,
          createdBy: session.user.id,
        });
        artisan.userId = user._id as any;
        await artisan.save();
      }
    }

    await logActivity({
      entityType: "ARTISAN",
      entityId: id,
      action: "UPDATED",
      remarks: `Updated artisan profile for ${artisan.name}`,
      userId: session.user.id,
      userName: session.user.name || "Staff",
      userRole: (session.user as any).role,
    });

    revalidatePath("/artisans");
    revalidatePath(`/artisans/${id}`);
    return { ok: true, data: undefined, message: "Artisan updated successfully" };
  } catch (error: any) {
    console.error("updateArtisan error:", error);
    return { ok: false, error: error.message || "Failed to update artisan" };
  }
}

export async function getArtisanWorkloadSummary(artisanId: string) {
  await connectDB();
  const now = new Date();

  // Pieces currently with this artisan
  const activePieces = await OrderItem.find({
    currentArtisanId: artisanId,
    currentLocation: "WITH_KARIGAR",
    isDeleted: false,
  }).lean();

  const overduePieces = activePieces.filter(
    (p) => p.dueDate && new Date(p.dueDate) < now
  );

  // Submissions pending review
  const pendingReviews = await ProgressUpdate.find({
    artisanId,
    verificationStatus: "PENDING",
    isDeleted: false,
  }).countDocuments();

  // Completed submissions
  const completedReviews = await ProgressUpdate.find({
    artisanId,
    verificationStatus: "APPROVED",
    isDeleted: false,
  }).countDocuments();

  return {
    activePiecesCount: activePieces.length,
    overduePiecesCount: overduePieces.length,
    pendingReviewsCount: pendingReviews,
    completedCount: completedReviews,
    activePieces,
  };
}
