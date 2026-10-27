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
import { PhotoUploader } from "@/components/photo/PhotoUploader";
import { createCustomer } from "@/actions/customer";
import { formatISTDate } from "@/lib/utils";
import { Plus, User, Phone, MapPin, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { PhotoInput } from "@/schemas/photo";

export interface CustomerRow {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  gstin?: string;
  notes?: string;
  ordersCount: number;
  createdAt: string | Date;
}

interface CustomerListClientProps {
  initialCustomers: CustomerRow[];
}

export function CustomerListClient({ initialCustomers }: CustomerListClientProps) {
  const [customers, setCustomers] = React.useState<CustomerRow[]>(initialCustomers);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form State
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [altPhone, setAltPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [city, setCity] = React.useState("");
  const [gstin, setGstin] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [photos, setPhotos] = React.useState<PhotoInput[]>([]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      toast.error("Name and phone number are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createCustomer({
        name,
        phone,
        altPhone,
        email: email || undefined,
        address,
        city,
        gstin,
        notes,
        photos,
      });

      if (res.ok) {
        toast.success(res.message || "Customer added successfully");
        setCustomers((prev) => [
          {
            id: res.data.id,
            code: res.data.code,
            name,
            phone,
            email,
            city,
            gstin,
            notes,
            ordersCount: 0,
            createdAt: new Date(),
          },
          ...prev,
        ]);
        setIsModalOpen(false);
        // Reset
        setName("");
        setPhone("");
        setAltPhone("");
        setEmail("");
        setAddress("");
        setCity("");
        setGstin("");
        setNotes("");
        setPhotos([]);
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error("Failed to add customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<CustomerRow>[] = [
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
      header: "Customer Name",
      cell: ({ row }) => (
        <div>
          <Link
            href={`/customers/${row.original.id}`}
            className="font-semibold text-neutral-900 dark:text-neutral-100 hover:text-amber-600 hover:underline"
          >
            {row.original.name}
          </Link>
          {row.original.email && (
            <p className="text-[11px] text-neutral-400">{row.original.email}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-neutral-600 dark:text-neutral-300">
          {row.original.phone}
        </span>
      ),
    },
    {
      accessorKey: "city",
      header: "City",
      cell: ({ row }) => (
        <span className="text-xs text-neutral-500">{row.original.city || "—"}</span>
      ),
    },
    {
      accessorKey: "ordersCount",
      header: "Orders",
      cell: ({ row }) => (
        <span className="font-bold text-xs bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 px-2 py-0.5 rounded-full">
          {row.original.ordersCount} Order(s)
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Registered",
      cell: ({ row }) => (
        <span className="text-xs text-neutral-400">
          {formatISTDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Link href={`/customers/${row.original.id}`}>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-600">
            View <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <User className="h-5 w-5 text-amber-600" />
            Customer Directory
          </h2>
          <p className="text-xs text-neutral-500">
            Manage your retail and bespoke jewellery clients, GSTIN, and order histories.
          </p>
        </div>

        <Button
          variant="gold"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="text-xs self-start sm:self-auto"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add Customer
        </Button>
      </div>

      {/* TanStack Table */}
      <DataTable
        columns={columns}
        data={customers}
        searchPlaceholder="Search customer by name, code, phone, city..."
        exportFilename="bms_customers.csv"
        renderMobileCard={(c) => (
          <div className="p-3.5 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                {c.code}
              </span>
              <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                {c.ordersCount} Order(s)
              </span>
            </div>
            <div>
              <Link
                href={`/customers/${c.id}`}
                className="font-bold text-sm text-neutral-900 dark:text-neutral-100 hover:underline"
              >
                {c.name}
              </Link>
              <p className="text-xs text-neutral-500 font-mono mt-0.5">{c.phone}</p>
              {c.city && (
                <p className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" /> {c.city}
                </p>
              )}
            </div>
            <div className="pt-1 flex justify-end">
              <Link href={`/customers/${c.id}`}>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  View History →
                </Button>
              </Link>
            </div>
          </div>
        )}
      />

      {/* Add Customer Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Register New Customer</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateCustomer} className="space-y-3.5 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Ananya Singhania"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Primary Mobile <span className="text-red-500">*</span>
                </label>
                <Input
                  type="tel"
                  placeholder="e.g. 9811122201"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Alternate Phone
                </label>
                <Input
                  type="tel"
                  placeholder="Optional"
                  value={altPhone}
                  onChange={(e) => setAltPhone(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="customer@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  City
                </label>
                <Input
                  placeholder="e.g. Mumbai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  GSTIN (If Business)
                </label>
                <Input
                  placeholder="27AAAAA0000A1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="h-9 text-xs uppercase"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Postal Address
              </label>
              <Textarea
                placeholder="Street address / apartment"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>

            <PhotoUploader
              photos={photos}
              onChange={setPhotos}
              label="Customer Reference / ID Proof Photos (Optional)"
              maxPhotos={3}
            />

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
                Save Customer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
