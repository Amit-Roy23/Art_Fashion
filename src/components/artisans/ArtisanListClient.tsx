"use client";

import * as React from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createArtisan } from "@/actions/artisan";
import { Hammer, Plus, Phone, ArrowRight, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";

export interface ArtisanRow {
  id: string;
  code: string;
  name: string;
  phone: string;
  speciality: string[];
  activePiecesCount: number;
  overdueCount: number;
  pendingReviewsCount: number;
  completedCount: number;
  isActive: boolean;
}

interface ArtisanListClientProps {
  initialArtisans: ArtisanRow[];
}

export function ArtisanListClient({ initialArtisans }: ArtisanListClientProps) {
  const [artisans, setArtisans] = React.useState<ArtisanRow[]>(initialArtisans);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form State
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [specialityStr, setSpecialityStr] = React.useState("Casting, Filing");
  const [notes, setNotes] = React.useState("");
  const [pin, setPin] = React.useState("1234");

  const handleCreateArtisan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      toast.error("Name and phone are required");
      return;
    }

    const specialities = specialityStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    try {
      const res = await createArtisan({
        name,
        phone,
        address,
        speciality: specialities,
        notes,
        idProof: [],
        pin: pin || undefined,
      });

      if (res.ok) {
        toast.success(res.message || "Artisan registered successfully");
        setArtisans((prev) => [
          {
            id: res.data.id,
            code: res.data.code,
            name,
            phone,
            speciality: specialities,
            activePiecesCount: 0,
            overdueCount: 0,
            pendingReviewsCount: 0,
            completedCount: 0,
            isActive: true,
          },
          ...prev,
        ]);
        setIsModalOpen(false);
        setName("");
        setPhone("");
        setAddress("");
        setNotes("");
        setPin("1234");
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Failed to create artisan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<ArtisanRow>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-400">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "Artisan Name",
      cell: ({ row }) => (
        <div>
          <Link
            href={`/artisans/${row.original.id}`}
            className="font-semibold text-neutral-900 dark:text-neutral-100 hover:text-amber-600 hover:underline text-xs"
          >
            {row.original.name}
          </Link>
          <p className="text-[11px] text-neutral-400">
            {row.original.speciality.join(", ")}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Mobile & Login",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-neutral-600 dark:text-neutral-300">
          {row.original.phone}
        </span>
      ),
    },
    {
      accessorKey: "activePiecesCount",
      header: "Pieces in Hand",
      cell: ({ row }) => (
        <span className="font-bold text-xs text-amber-700 dark:text-amber-400">
          {row.original.activePiecesCount} piece(s)
        </span>
      ),
    },
    {
      accessorKey: "overdueCount",
      header: "Overdue",
      cell: ({ row }) =>
        row.original.overdueCount > 0 ? (
          <span className="rounded bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-bold dark:bg-red-950 dark:text-red-300">
            {row.original.overdueCount} Overdue
          </span>
        ) : (
          <span className="text-neutral-400 text-xs">0</span>
        ),
    },
    {
      accessorKey: "pendingReviewsCount",
      header: "Pending Review",
      cell: ({ row }) =>
        row.original.pendingReviewsCount > 0 ? (
          <span className="rounded bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold dark:bg-amber-950 dark:text-amber-200">
            {row.original.pendingReviewsCount} to review
          </span>
        ) : (
          <span className="text-neutral-400 text-xs">0</span>
        ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Link href={`/artisans/${row.original.id}`}>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-600">
            View <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Hammer className="h-5 w-5 text-amber-600" />
            Karigars (Artisans) Management
          </h2>
          <p className="text-xs text-neutral-500">
            Workshop artisans, PIN mobile logins, active workloads, and craft specialities.
          </p>
        </div>

        <Button
          variant="gold"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="text-xs self-start sm:self-auto"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add Karigar
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={artisans}
        searchPlaceholder="Search artisan by name, code, phone, speciality..."
        exportFilename="bms_artisans.csv"
        renderMobileCard={(art) => (
          <div className="p-3.5 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                {art.code}
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold dark:bg-amber-950 dark:text-amber-200">
                {art.activePiecesCount} in Hand
              </span>
            </div>
            <div>
              <Link
                href={`/artisans/${art.id}`}
                className="font-bold text-sm text-neutral-900 dark:text-neutral-100 hover:underline"
              >
                {art.name}
              </Link>
              <p className="text-xs text-neutral-500 font-mono">{art.phone}</p>
              <p className="text-[11px] text-neutral-400">
                {art.speciality.join(", ")}
              </p>
            </div>
            <div className="flex justify-end pt-1">
              <Link href={`/artisans/${art.id}`}>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  View Profile & Work →
                </Button>
              </Link>
            </div>
          </div>
        )}
      />

      {/* Add Artisan Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Register Workshop Karigar</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateArtisan} className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Ramesh Verma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <Input
                  type="tel"
                  placeholder="9820044441"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Portal Login PIN (4–6 Digits)
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="1234"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="h-9 text-xs font-mono text-center tracking-widest"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Specialities (comma separated)
              </label>
              <Input
                placeholder="Casting, Filing, Setting, Meenakari"
                value={specialityStr}
                onChange={(e) => setSpecialityStr(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Workshop Address / Bench No
              </label>
              <Input
                placeholder="e.g. Bench 4, Zaveri Bazaar workshop"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="gold"
                size="sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Save Karigar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
