"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  updateCompanySettings,
  upsertStage,
  upsertStatusOption,
  updatePermissionMatrix,
} from "@/actions/settings";
import { createUser, resetUserCredentials, toggleUserStatus } from "@/actions/user";
import { DEFAULT_PERMISSION_MATRIX, PermissionMatrix, Permission } from "@/lib/rbac";
import { toast } from "sonner";
import {
  Building2,
  Sliders,
  Layers,
  Palette,
  Users,
  ShieldCheck,
  Plus,
  Key,
  Check,
  X,
  Lock,
  Camera,
  Scale,
  Save,
  RotateCcw,
} from "lucide-react";

interface SettingsClientProps {
  initialSettings: any;
  stages: any[];
  statusOptions: any[];
  users: any[];
  artisans: any[];
  currentUserRole: string;
}

export function SettingsClient({
  initialSettings,
  stages: initialStages,
  statusOptions: initialStatusOptions,
  users: initialUsers,
  artisans,
  currentUserRole,
}: SettingsClientProps) {
  const isOwner = currentUserRole === "OWNER";

  // Tab 1: Company Profile & Policies
  const [companyName, setCompanyName] = React.useState(initialSettings.companyName || "");
  const [tagline, setTagline] = React.useState(initialSettings.tagline || "");
  const [logoUrl, setLogoUrl] = React.useState(initialSettings.logoUrl || "");
  const [address, setAddress] = React.useState(initialSettings.address || "");
  const [city, setCity] = React.useState(initialSettings.city || "");
  const [phone, setPhone] = React.useState(initialSettings.phone || "");
  const [email, setEmail] = React.useState(initialSettings.email || "");
  const [gstin, setGstin] = React.useState(initialSettings.gstin || "");
  const [pdfFooterText, setPdfFooterText] = React.useState(
    initialSettings.pdfFooterText || "BMS Jewellery — Computer Generated Document"
  );
  const [weightTolerance, setWeightTolerance] = React.useState(
    initialSettings.weightTolerancePercent ?? 0.5
  );
  const [photoRequired, setPhotoRequired] = React.useState({
    pieceCreation: initialSettings.photoRequired?.pieceCreation ?? true,
    karigarSubmission: initialSettings.photoRequired?.karigarSubmission ?? true,
    jobWorkReturn: initialSettings.photoRequired?.jobWorkReturn ?? true,
    delivery: initialSettings.photoRequired?.delivery ?? true,
  });

  // Tab 2: Masters (Categories, Purities, Processes)
  const [categories, setCategories] = React.useState<string[]>(
    initialSettings.categories || []
  );
  const [newCat, setNewCat] = React.useState("");
  const [purities, setPurities] = React.useState<string[]>(
    initialSettings.purities || []
  );
  const [newPurity, setNewPurity] = React.useState("");
  const [processTypes, setProcessTypes] = React.useState<string[]>(
    initialSettings.processTypes || []
  );
  const [newProcess, setNewProcess] = React.useState("");

  // Tab 3: Stages
  const [stages, setStages] = React.useState<any[]>(initialStages);
  const [stageModalOpen, setStageModalOpen] = React.useState(false);
  const [editingStage, setEditingStage] = React.useState<any | null>(null);
  const [stageName, setStageName] = React.useState("");
  const [stageOrder, setStageOrder] = React.useState(1);
  const [stageColor, setStageColor] = React.useState("#d97706");
  const [stageReqPhoto, setStageReqPhoto] = React.useState(true);
  const [stageReqWeight, setStageReqWeight] = React.useState(true);

  // Tab 4: Status Options
  const [statusOptions, setStatusOptions] = React.useState<any[]>(initialStatusOptions);
  const [statusModalOpen, setStatusModalOpen] = React.useState(false);
  const [statusScope, setStatusScope] = React.useState<"ORDER" | "PIECE" | "ASSIGNMENT" | "JOBWORK">("PIECE");
  const [statusName, setStatusName] = React.useState("");
  const [statusColor, setStatusColor] = React.useState("#3b82f6");
  const [statusCategory, setStatusCategory] = React.useState("IN_PRODUCTION");
  const [statusSortOrder, setStatusSortOrder] = React.useState(1);
  const [statusIsDefault, setStatusIsDefault] = React.useState(false);

  // Tab 5: Users
  const [users, setUsers] = React.useState<any[]>(initialUsers);
  const [userModalOpen, setUserModalOpen] = React.useState(false);
  const [newUserName, setNewUserName] = React.useState("");
  const [newUserPhone, setNewUserPhone] = React.useState("");
  const [newUserEmail, setNewUserEmail] = React.useState("");
  const [newUserRole, setNewUserRole] = React.useState<"OWNER" | "MANAGER" | "STAFF" | "KARIGAR">("STAFF");
  const [newUserPassword, setNewUserPassword] = React.useState("");
  const [newUserPin, setNewUserPin] = React.useState("");
  const [newUserArtisanId, setNewUserArtisanId] = React.useState("");

  // Reset credential modal
  const [resetModalOpen, setResetModalOpen] = React.useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = React.useState<any | null>(null);
  const [resetPassword, setResetPassword] = React.useState("");
  const [resetPin, setResetPin] = React.useState("");

  // Tab 6: RBAC
  const [matrix, setMatrix] = React.useState<PermissionMatrix>(
    initialSettings.permissionMatrix || DEFAULT_PERMISSION_MATRIX
  );

  const [isSaving, setIsSaving] = React.useState(false);

  // 1. Save Company Settings + Masters
  const handleSaveCompanySettings = async () => {
    setIsSaving(true);
    try {
      const res = await updateCompanySettings({
        companyName,
        tagline,
        logoUrl,
        address,
        city,
        phone,
        email,
        gstin,
        pdfFooterText,
        weightTolerancePercent: Number(weightTolerance),
        photoRequired,
        categories,
        purities,
        processTypes,
      });

      if (res.ok) {
        toast.success("Settings saved successfully.");
      } else {
        toast.error(res.error || "Failed to update settings");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Save Stage
  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageName.trim()) {
      toast.error("Stage name is required");
      return;
    }

    try {
      const res = await upsertStage({
        id: editingStage?._id,
        name: stageName.trim(),
        sortOrder: Number(stageOrder),
        colour: stageColor,
        requiresPhoto: stageReqPhoto,
        requiresWeight: stageReqWeight,
        isActive: true,
      });

      if (res.ok) {
        toast.success("Stage saved successfully.");
        setStageModalOpen(false);
        setEditingStage(null);
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to save stage");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save stage");
    }
  };

  // 3. Save Status Option
  const handleSaveStatusOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusName.trim()) {
      toast.error("Status name is required");
      return;
    }

    try {
      const res = await upsertStatusOption({
        scope: statusScope,
        name: statusName.trim(),
        colour: statusColor,
        systemCategory: statusCategory as any,
        sortOrder: Number(statusSortOrder),
        isDefault: statusIsDefault,
        isActive: true,
      });

      if (res.ok) {
        toast.success("Status option saved.");
        setStatusModalOpen(false);
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to save status option");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save status option");
    }
  };

  // 4. Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserPhone.trim()) {
      toast.error("Name and Phone are required");
      return;
    }

    try {
      const res = await createUser({
        name: newUserName.trim(),
        phone: newUserPhone.trim(),
        email: newUserEmail.trim() || undefined,
        role: newUserRole,
        password: newUserRole !== "KARIGAR" ? newUserPassword : undefined,
        pin: newUserRole === "KARIGAR" ? newUserPin : undefined,
        artisanId: newUserRole === "KARIGAR" && newUserArtisanId ? newUserArtisanId : undefined,
        isActive: true,
      });

      if (res.ok) {
        toast.success("User created successfully");
        setUserModalOpen(false);
        setNewUserName("");
        setNewUserPhone("");
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserPin("");
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to create user");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    }
  };

  // 5. Reset Credentials
  const handleResetCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset) return;

    try {
      const res = await resetUserCredentials(selectedUserForReset._id, {
        password: resetPassword || undefined,
        pin: resetPin || undefined,
      });

      if (res.ok) {
        toast.success("Credentials updated successfully");
        setResetModalOpen(false);
        setSelectedUserForReset(null);
        setResetPassword("");
        setResetPin("");
      } else {
        toast.error(res.error || "Failed to reset credentials");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reset credentials");
    }
  };

  // 6. Toggle User Active
  const handleToggleUserActive = async (user: any) => {
    try {
      const res = await toggleUserStatus(user._id, !user.isActive);
      if (res.ok) {
        toast.success(`User ${user.isActive ? "deactivated" : "activated"}`);
        setUsers((prev) =>
          prev.map((u) => (u._id === user._id ? { ...u, isActive: !u.isActive } : u))
        );
      } else {
        toast.error(res.error || "Failed to toggle status");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
    }
  };

  // 7. Save Permission Matrix
  const handleSavePermissions = async () => {
    try {
      const res = await updatePermissionMatrix(matrix);
      if (res.ok) {
        toast.success("RBAC permission matrix saved.");
      } else {
        toast.error(res.error || "Failed to save permissions");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save permissions");
    }
  };

  const togglePermission = (role: "MANAGER" | "STAFF" | "KARIGAR", permission: Permission) => {
    setMatrix((prev) => {
      const currentList = prev[role] || [];
      const has = currentList.includes(permission);
      const updated = has
        ? currentList.filter((p) => p !== permission)
        : [...currentList, permission];
      return { ...prev, [role]: updated };
    });
  };

  const allPermissions: Array<{ key: Permission; label: string }> = [
    { key: "orders:create", label: "Create Orders" },
    { key: "orders:edit", label: "Edit Orders & Pieces" },
    { key: "orders:delete", label: "Delete / Cancel Orders" },
    { key: "assignments:create", label: "Create Work Orders (Assign Karigar)" },
    { key: "assignments:edit", label: "Review Submissions & Edit Assignments" },
    { key: "jobwork:manage", label: "Send & Receive Outside Job Work" },
    { key: "deliveries:create", label: "Handover Pieces & Create Deliveries" },
    { key: "weights:edit", label: "Override Weight Records" },
    { key: "settings:manage", label: "Manage Settings, Stages & Statuses" },
    { key: "reports:view", label: "View & Export Business Reports" },
    { key: "users:manage", label: "Create Users & Reset Passwords/PINs" },
    { key: "prices:view", label: "View Customer Invoices & Pricing" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Settings & Business Configuration
        </h1>
        <p className="text-sm text-slate-500">
          Configure production stages, statuses, company profile, user accounts, and permissions
        </p>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-xl flex flex-wrap h-auto gap-1">
          <TabsTrigger value="company" className="flex items-center gap-1.5 text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5" /> Company & Policies
          </TabsTrigger>
          <TabsTrigger value="stages" className="flex items-center gap-1.5 text-xs font-semibold">
            <Sliders className="w-3.5 h-3.5" /> Production Stages ({stages.length})
          </TabsTrigger>
          <TabsTrigger value="statuses" className="flex items-center gap-1.5 text-xs font-semibold">
            <Palette className="w-3.5 h-3.5" /> Status Options ({statusOptions.length})
          </TabsTrigger>
          <TabsTrigger value="masters" className="flex items-center gap-1.5 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5" /> Masters (Categories & Purities)
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-1.5 text-xs font-semibold">
            <Users className="w-3.5 h-3.5" /> Users & Karigars ({users.length})
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="rbac" className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
              Role Permissions (RBAC)
            </TabsTrigger>
          )}
        </TabsList>

        {/* 1. COMPANY & POLICIES */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Company Profile & Document Branding</CardTitle>
              <CardDescription>
                Details shown on printed Work Orders, Job Work Challans, and Delivery Notes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Company Name</label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. BMS Jewellers Pvt. Ltd."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Tagline / Subtitle</label>
                  <Input
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. Fine Handcrafted Gold & Diamond Jewellery"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Logo URL</label>
                  <Input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://res.cloudinary.com/..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">GSTIN</label>
                  <Input
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="e.g. 24ABCDE1234F1Z5"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Official Phone</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Official Email</label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="orders@bmsjewellers.com"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Workshop / Showroom Address</label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Zaveri Bazaar, Marine Lines, Mumbai"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">PDF Legal Footer Text</label>
                  <Input
                    value={pdfFooterText}
                    onChange={(e) => setPdfFooterText(e.target.value)}
                    placeholder="This is a computer generated work order. No physical signature required."
                  />
                </div>
              </div>

              {/* Business Rules */}
              <div className="pt-6 border-t space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-700" />
                  Business Rules & Thresholds
                </h3>

                <div className="p-4 bg-slate-50 border rounded-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-sm font-semibold text-slate-800">
                        Weight Variance Alert Tolerance (%)
                      </span>
                      <p className="text-xs text-slate-500">
                        Highlight weight loss/gain in red and flag for audit if difference exceeds this limit.
                      </p>
                    </div>
                    <div className="w-28">
                      <Input
                        type="number"
                        step="0.05"
                        min="0.1"
                        max="10"
                        value={weightTolerance}
                        onChange={(e) => setWeightTolerance(parseFloat(e.target.value) || 0.5)}
                        className="font-bold text-center"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-slate-500" />
                      Mandatory Photo Requirements
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border cursor-pointer text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={photoRequired.pieceCreation}
                          onChange={(e) =>
                            setPhotoRequired({ ...photoRequired, pieceCreation: e.target.checked })
                          }
                          className="w-4 h-4 text-amber-700 rounded"
                        />
                        Require photo when adding a piece to an order
                      </label>

                      <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border cursor-pointer text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={photoRequired.karigarSubmission}
                          onChange={(e) =>
                            setPhotoRequired({ ...photoRequired, karigarSubmission: e.target.checked })
                          }
                          className="w-4 h-4 text-amber-700 rounded"
                        />
                        Require photo for Karigar progress submissions
                      </label>

                      <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border cursor-pointer text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={photoRequired.jobWorkReturn}
                          onChange={(e) =>
                            setPhotoRequired({ ...photoRequired, jobWorkReturn: e.target.checked })
                          }
                          className="w-4 h-4 text-amber-700 rounded"
                        />
                        Require photo when receiving Job Work from vendor
                      </label>

                      <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border cursor-pointer text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={photoRequired.delivery}
                          onChange={(e) =>
                            setPhotoRequired({ ...photoRequired, delivery: e.target.checked })
                          }
                          className="w-4 h-4 text-amber-700 rounded"
                        />
                        Require photo during customer delivery / handover
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-slate-50/50 flex justify-end">
              <Button
                onClick={handleSaveCompanySettings}
                disabled={isSaving}
                className="bg-amber-700 hover:bg-amber-800 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving..." : "Save Settings & Policies"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* 2. PRODUCTION STAGES */}
        <TabsContent value="stages">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Production Stages Pipeline</CardTitle>
                <CardDescription>
                  Define the manufacturing pipeline a jewellery piece progresses through
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingStage(null);
                  setStageName("");
                  setStageOrder(stages.length + 1);
                  setStageColor("#d97706");
                  setStageReqPhoto(true);
                  setStageReqWeight(true);
                  setStageModalOpen(true);
                }}
                className="bg-amber-700 hover:bg-amber-800 text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Add Stage
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 uppercase text-slate-600 border-y font-semibold">
                    <tr>
                      <th className="px-4 py-2.5 text-center">Order</th>
                      <th className="px-4 py-2.5">Stage Name</th>
                      <th className="px-4 py-2.5">Colour</th>
                      <th className="px-4 py-2.5 text-center">Requires Photo</th>
                      <th className="px-4 py-2.5 text-center">Requires Weight</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stages.map((st, i) => (
                      <tr key={st._id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-center font-bold text-slate-500">
                          {st.sortOrder}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-slate-900 flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full border shadow-xs"
                            style={{ backgroundColor: st.colour || "#d97706" }}
                          />
                          {st.name}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-500">{st.colour}</td>
                        <td className="px-4 py-2.5 text-center">
                          {st.requiresPhoto ? (
                            <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {st.requiresWeight ? (
                            <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingStage(st);
                              setStageName(st.name);
                              setStageOrder(st.sortOrder);
                              setStageColor(st.colour || "#d97706");
                              setStageReqPhoto(st.requiresPhoto ?? true);
                              setStageReqWeight(st.requiresWeight ?? true);
                              setStageModalOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. STATUS OPTIONS */}
        <TabsContent value="statuses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Custom Status Options</CardTitle>
                <CardDescription>
                  Status labels per scope mapped to standard system categories for reporting
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setStatusName("");
                  setStatusColor("#3b82f6");
                  setStatusSortOrder(1);
                  setStatusIsDefault(false);
                  setStatusModalOpen(true);
                }}
                className="bg-amber-700 hover:bg-amber-800 text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Add Status
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 uppercase text-slate-600 border-y font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Scope</th>
                      <th className="px-4 py-2.5">Status Label</th>
                      <th className="px-4 py-2.5">System Category</th>
                      <th className="px-4 py-2.5 text-center">Order</th>
                      <th className="px-4 py-2.5 text-center">Default</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {statusOptions.map((opt, i) => (
                      <tr key={opt._id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-bold text-slate-700">{opt.scope}</td>
                        <td className="px-4 py-2.5 font-medium flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: opt.colour }}
                          />
                          <Badge
                            style={{
                              backgroundColor: `${opt.colour}15`,
                              color: opt.colour,
                              borderColor: `${opt.colour}40`,
                            }}
                          >
                            {opt.name}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-600">
                          {opt.systemCategory}
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-slate-500">
                          {opt.sortOrder}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {opt.isDefault ? (
                            <Badge className="bg-slate-800 text-white text-[10px]">DEFAULT</Badge>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. MASTERS (Categories, Purities, Processes) */}
        <TabsContent value="masters">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Categories */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Piece Categories</CardTitle>
                <CardDescription className="text-xs">
                  Types of jewellery items manufactured
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="New category..."
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                    className="text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (newCat.trim() && !categories.includes(newCat.trim())) {
                        setCategories([...categories, newCat.trim()]);
                        setNewCat("");
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto p-1 border rounded-lg bg-slate-50/50">
                  {categories.map((c, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-xs font-normal flex items-center gap-1.5 bg-white"
                    >
                      {c}
                      <button
                        type="button"
                        onClick={() => setCategories(categories.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-red-600 font-bold"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Purities */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Gold & Silver Purities</CardTitle>
                <CardDescription className="text-xs">
                  Supported metal grades (e.g. 22K, 18K)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. 20K..."
                    value={newPurity}
                    onChange={(e) => setNewPurity(e.target.value)}
                    className="text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (newPurity.trim() && !purities.includes(newPurity.trim())) {
                        setPurities([...purities, newPurity.trim()]);
                        setNewPurity("");
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto p-1 border rounded-lg bg-slate-50/50">
                  {purities.map((p, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-xs font-normal flex items-center gap-1.5 bg-white"
                    >
                      {p}
                      <button
                        type="button"
                        onClick={() => setPurities(purities.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-red-600 font-bold"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Process Types */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Outside Process Types</CardTitle>
                <CardDescription className="text-xs">
                  External job work processes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Enameling..."
                    value={newProcess}
                    onChange={(e) => setNewProcess(e.target.value)}
                    className="text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (newProcess.trim() && !processTypes.includes(newProcess.trim())) {
                        setProcessTypes([...processTypes, newProcess.trim()]);
                        setNewProcess("");
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto p-1 border rounded-lg bg-slate-50/50">
                  {processTypes.map((pr, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-xs font-normal flex items-center gap-1.5 bg-white"
                    >
                      {pr}
                      <button
                        type="button"
                        onClick={() => setProcessTypes(processTypes.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-red-600 font-bold"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleSaveCompanySettings}
              disabled={isSaving}
              className="bg-amber-700 hover:bg-amber-800 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Masters"}
            </Button>
          </div>
        </TabsContent>

        {/* 5. USERS & LOGINS */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">System Users & Artisan Accounts</CardTitle>
                <CardDescription>
                  Manage logins for Owner, Managers, Staff, and Mobile-PIN logins for Karigars
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setUserModalOpen(true)}
                className="bg-amber-700 hover:bg-amber-800 text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Add User
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 uppercase text-slate-600 border-y font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">User</th>
                      <th className="px-4 py-2.5">Phone</th>
                      <th className="px-4 py-2.5">Email</th>
                      <th className="px-4 py-2.5">Role</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u._id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-bold text-slate-900">
                          {u.name}
                          {u.artisanId && (
                            <span className="ml-1.5 text-[10px] text-amber-700 font-normal">
                              ({u.artisanId.name})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 font-medium">{u.phone}</td>
                        <td className="px-4 py-2.5 text-slate-500">{u.email || "—"}</td>
                        <td className="px-4 py-2.5">
                          <Badge
                            variant={u.role === "OWNER" ? "default" : "outline"}
                            className={
                              u.role === "OWNER"
                                ? "bg-amber-700 text-white"
                                : u.role === "KARIGAR"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : ""
                            }
                          >
                            {u.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge
                            variant={u.isActive ? "default" : "destructive"}
                            className={u.isActive ? "bg-emerald-600 text-white text-[10px]" : "text-[10px]"}
                          >
                            {u.isActive ? "ACTIVE" : "INACTIVE"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUserForReset(u);
                              setResetPassword("");
                              setResetPin("");
                              setResetModalOpen(true);
                            }}
                            title="Reset Password or PIN"
                          >
                            <Key className="w-3.5 h-3.5 text-slate-600" />
                          </Button>
                          {u.role !== "OWNER" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleUserActive(u)}
                              className={u.isActive ? "text-red-600 hover:text-red-700" : "text-emerald-600"}
                            >
                              {u.isActive ? "Deactivate" : "Activate"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. RBAC PERMISSIONS */}
        {isOwner && (
          <TabsContent value="rbac">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-700" />
                    Role-Based Access Control (RBAC) Matrix
                  </CardTitle>
                  <CardDescription>
                    Configure server-enforced permissions for each role. OWNER always has superadmin access.
                  </CardDescription>
                </div>
                <Button
                  onClick={handleSavePermissions}
                  className="bg-amber-700 hover:bg-amber-800 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Permission Matrix
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 uppercase text-slate-700 border-y font-semibold">
                      <tr>
                        <th className="px-4 py-3">Permission / Capability</th>
                        <th className="px-4 py-3 text-center w-28">OWNER</th>
                        <th className="px-4 py-3 text-center w-28">MANAGER</th>
                        <th className="px-4 py-3 text-center w-28">STAFF</th>
                        <th className="px-4 py-3 text-center w-28">KARIGAR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allPermissions.map((perm) => (
                        <tr key={perm.key} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {perm.label}
                            <span className="block font-mono text-[10px] text-slate-400 font-normal">
                              {perm.key}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center bg-amber-50/30">
                            <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={matrix.MANAGER?.includes(perm.key) ?? false}
                              onChange={() => togglePermission("MANAGER", perm.key)}
                              className="w-4 h-4 text-amber-700 rounded focus:ring-amber-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={matrix.STAFF?.includes(perm.key) ?? false}
                              onChange={() => togglePermission("STAFF", perm.key)}
                              className="w-4 h-4 text-amber-700 rounded focus:ring-amber-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={matrix.KARIGAR?.includes(perm.key) ?? false}
                              onChange={() => togglePermission("KARIGAR", perm.key)}
                              className="w-4 h-4 text-amber-700 rounded focus:ring-amber-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Stage Upsert Modal */}
      <Dialog open={stageModalOpen} onOpenChange={setStageModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingStage ? "Edit Production Stage" : "Add Production Stage"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveStage} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Stage Name *</label>
              <Input
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                placeholder="e.g. Setting, Quality Check"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Sort Order</label>
                <Input
                  type="number"
                  min="1"
                  value={stageOrder}
                  onChange={(e) => setStageOrder(parseInt(e.target.value) || 1)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Hex Colour</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={stageColor}
                    onChange={(e) => setStageColor(e.target.value)}
                    className="w-9 h-9 p-0.5 rounded border cursor-pointer"
                  />
                  <Input
                    value={stageColor}
                    onChange={(e) => setStageColor(e.target.value)}
                    className="font-mono text-xs uppercase"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={stageReqPhoto}
                  onChange={(e) => setStageReqPhoto(e.target.checked)}
                  className="w-4 h-4 text-amber-700 rounded"
                />
                Requires Photo when completing this stage
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={stageReqWeight}
                  onChange={(e) => setStageReqWeight(e.target.checked)}
                  className="w-4 h-4 text-amber-700 rounded"
                />
                Requires Weight measurement on completion
              </label>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setStageModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-700 hover:bg-amber-800 text-white">
                Save Stage
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Status Option Upsert Modal */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Add Custom Status Option</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveStatusOption} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Scope *</label>
              <select
                value={statusScope}
                onChange={(e) => setStatusScope(e.target.value as any)}
                className="w-full text-xs border rounded-lg p-2 bg-white"
              >
                <option value="PIECE">PIECE (Individual Item)</option>
                <option value="ORDER">ORDER (Customer Order)</option>
                <option value="ASSIGNMENT">ASSIGNMENT (Work Order)</option>
                <option value="JOBWORK">JOBWORK (Outside Challan)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Status Label *</label>
              <Input
                value={statusName}
                onChange={(e) => setStatusName(e.target.value)}
                placeholder="e.g. Under Setting, In Inspection"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                System Category (for Reports & Dashboard) *
              </label>
              <select
                value={statusCategory}
                onChange={(e) => setStatusCategory(e.target.value)}
                className="w-full text-xs border rounded-lg p-2 bg-white"
              >
                <option value="PENDING">PENDING</option>
                <option value="IN_PRODUCTION">IN_PRODUCTION</option>
                <option value="AT_JOB_WORK">AT_JOB_WORK</option>
                <option value="READY">READY</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="ON_HOLD">ON_HOLD</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Colour</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={statusColor}
                    onChange={(e) => setStatusColor(e.target.value)}
                    className="w-9 h-9 p-0.5 rounded border cursor-pointer"
                  />
                  <Input
                    value={statusColor}
                    onChange={(e) => setStatusColor(e.target.value)}
                    className="font-mono text-xs uppercase"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Sort Order</label>
                <Input
                  type="number"
                  min="1"
                  value={statusSortOrder}
                  onChange={(e) => setStatusSortOrder(parseInt(e.target.value) || 1)}
                  required
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setStatusModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-700 hover:bg-amber-800 text-white">
                Save Status
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add User Modal */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Create New User Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Full Name *</label>
              <Input
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="e.g. Ramesh Soni"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Phone (Login Username) *</label>
              <Input
                value={newUserPhone}
                onChange={(e) => setNewUserPhone(e.target.value)}
                placeholder="10-digit mobile number"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Email Address (Optional)</label>
              <Input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="staff@bms.local"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">User Role *</label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as any)}
                className="w-full text-xs border rounded-lg p-2 bg-white"
              >
                <option value="STAFF">STAFF (Floor Operator)</option>
                <option value="MANAGER">MANAGER (Production Lead)</option>
                <option value="OWNER">OWNER (Super Admin)</option>
                <option value="KARIGAR">KARIGAR (Mobile PIN Login)</option>
              </select>
            </div>

            {newUserRole === "KARIGAR" ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-blue-900">Link to Artisan Record</label>
                  <select
                    value={newUserArtisanId}
                    onChange={(e) => setNewUserArtisanId(e.target.value)}
                    className="w-full text-xs border rounded-lg p-2 bg-white"
                  >
                    <option value="">-- Choose Artisan Profile --</option>
                    {artisans.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.name} ({a.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-blue-900">4–6 Digit Mobile PIN *</label>
                  <Input
                    type="password"
                    maxLength={6}
                    value={newUserPin}
                    onChange={(e) => setNewUserPin(e.target.value)}
                    placeholder="e.g. 1234"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Account Password *</label>
                <Input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                />
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setUserModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-700 hover:bg-amber-800 text-white">
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password / PIN Modal */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Reset Credentials for {selectedUserForReset?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetCredentials} className="space-y-4 pt-2">
            {selectedUserForReset?.role === "KARIGAR" ? (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">New 4–6 Digit PIN *</label>
                <Input
                  type="password"
                  maxLength={6}
                  value={resetPin}
                  onChange={(e) => setResetPin(e.target.value)}
                  placeholder="e.g. 1234"
                  required
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">New Password *</label>
                <Input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
              </div>
            )}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setResetModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-700 hover:bg-amber-800 text-white">
                Update Credentials
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
