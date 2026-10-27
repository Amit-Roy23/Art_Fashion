import * as React from "react";
import { connectDB } from "@/lib/db";
import { Artisan } from "@/models/Artisan";
import { OrderItem } from "@/models/OrderItem";
import { ProgressUpdate } from "@/models/ProgressUpdate";
import { ArtisanListClient, ArtisanRow } from "@/components/artisans/ArtisanListClient";


export default async function ArtisansPage() {
  await connectDB();
  const now = new Date();

  const artisans = await Artisan.find({ isDeleted: false })
    .sort({ name: 1 })
    .lean();

  const artisanRows: ArtisanRow[] = await Promise.all(
    artisans.map(async (art) => {
      const activePieces = await OrderItem.find({
        currentArtisanId: art._id,
        currentLocation: "WITH_KARIGAR",
        isDeleted: false,
      }).lean();

      const overdueCount = activePieces.filter(
        (p) => p.dueDate && new Date(p.dueDate) < now
      ).length;

      const pendingReviewsCount = await ProgressUpdate.countDocuments({
        artisanId: art._id,
        verificationStatus: "PENDING",
        isDeleted: false,
      });

      const completedCount = await ProgressUpdate.countDocuments({
        artisanId: art._id,
        verificationStatus: "APPROVED",
        isDeleted: false,
      });

      return {
        id: art._id.toString(),
        code: art.code,
        name: art.name,
        phone: art.phone,
        speciality: art.speciality || [],
        activePiecesCount: activePieces.length,
        overdueCount,
        pendingReviewsCount,
        completedCount,
        isActive: art.isActive,
      };
    })
  );

  return <ArtisanListClient initialArtisans={artisanRows} />;
}
