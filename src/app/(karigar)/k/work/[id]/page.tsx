import * as React from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { OrderItem } from "@/models/OrderItem";
import { Assignment } from "@/models/Assignment";
import { ProgressUpdate } from "@/models/ProgressUpdate";
import { KarigarWorkDetailClient } from "@/components/karigar/KarigarWorkDetailClient";


export default async function KarigarWorkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  await connectDB();

  const piece = await OrderItem.findById(id)
    .populate("currentStageId")
    .lean();

  if (!piece || piece.isDeleted) {
    notFound();
  }

  // Security check: Karigar can only see own assigned pieces (Owner can view all)
  const role = (session.user as any).role;
  const userArtisanId = (session.user as any).artisanId;

  if (
    role === "KARIGAR" &&
    piece.currentArtisanId?.toString() !== userArtisanId
  ) {
    redirect("/k/home");
  }

  // Find assignment
  const assignment = await Assignment.findOne({
    "items.orderItemId": piece._id,
    isDeleted: false,
  })
    .sort({ issueDate: -1 })
    .lean();

  // Find submissions for this piece
  const submissions = await ProgressUpdate.find({
    orderItemId: piece._id,
    isDeleted: false,
  })
    .populate("stageId")
    .sort({ submittedAt: -1 })
    .lean();

  return (
    <KarigarWorkDetailClient
      piece={piece}
      assignment={assignment}
      submissions={submissions}
    />
  );
}
