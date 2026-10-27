import * as React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Settings } from "@/models/Settings";
import { ProductionStage } from "@/models/ProductionStage";
import { StatusOption } from "@/models/StatusOption";
import { User } from "@/models/User";
import { Artisan } from "@/models/Artisan";
import { SettingsClient } from "@/components/settings/SettingsClient";

export const metadata: Metadata = {
  title: "Settings & Administration | BMS",
  description: "Configure jewellery manufacturing stages, custom statuses, user accounts, and RBAC matrix",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userRole = (session.user as any).role || "STAFF";

  await connectDB();

  const [settings, stagesRaw, statusOptionsRaw, usersRaw, artisansRaw] = await Promise.all([
    Settings.getSettings(),
    ProductionStage.find({ isDeleted: false }).sort({ sortOrder: 1 }).lean(),
    StatusOption.find({ isDeleted: false }).sort({ scope: 1, sortOrder: 1 }).lean(),
    User.find({ isDeleted: false })
      .populate("artisanId", "name code")
      .select("-passwordHash -pinHash")
      .sort({ createdAt: -1 })
      .lean(),
    Artisan.find({ isDeleted: false, isActive: true })
      .select("_id name code phone")
      .sort({ name: 1 })
      .lean(),
  ]);

  const stages = stagesRaw.map((s: any) => ({
    _id: s._id.toString(),
    name: s.name,
    sortOrder: s.sortOrder,
    colour: s.colour,
    requiresPhoto: s.requiresPhoto,
    requiresWeight: s.requiresWeight,
    isActive: s.isActive,
  }));

  const statusOptions = statusOptionsRaw.map((opt: any) => ({
    _id: opt._id.toString(),
    scope: opt.scope,
    name: opt.name,
    colour: opt.colour,
    systemCategory: opt.systemCategory,
    sortOrder: opt.sortOrder,
    isDefault: opt.isDefault,
    isActive: opt.isActive,
  }));

  const users = usersRaw.map((u: any) => ({
    _id: u._id.toString(),
    name: u.name,
    phone: u.phone,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    artisanId: u.artisanId
      ? { _id: u.artisanId._id.toString(), name: u.artisanId.name, code: u.artisanId.code }
      : null,
  }));

  const artisans = artisansRaw.map((a: any) => ({
    _id: a._id.toString(),
    name: a.name,
    code: a.code,
    phone: a.phone,
  }));

  return (
    <div className="space-y-6">
      <SettingsClient
        initialSettings={JSON.parse(JSON.stringify(settings))}
        stages={stages}
        statusOptions={statusOptions}
        users={users}
        artisans={artisans}
        currentUserRole={userRole}
      />
    </div>
  );
}
