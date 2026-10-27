"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShoppingBag,
  User,
  Gem,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  Loader2,
  Calendar,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WeightInput } from "@/components/forms/WeightInput";
import { RemarksField } from "@/components/forms/RemarksField";
import { PhotoUploader } from "@/components/photo/PhotoUploader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { createOrder } from "@/actions/order";
import { createCustomer } from "@/actions/customer";
import { toast } from "sonner";
import { PhotoInput } from "@/schemas/photo";

interface CustomerOption {
  id: string;
  code: string;
  name: string;
  phone: string;
  city?: string;
}

interface PieceFormState {
  category: string;
  description: string;
  metal: "Gold" | "Silver" | "Platinum" | "Other";
  purity: string;
  size: string;
  quantity: number;
  stoneDetails: string;
  estimatedWeightMg: number;
  specifications: string;
  photos: PhotoInput[];
  dueDate: string;
  remarks: string;
}

interface CreateOrderWizardProps {
  customers: CustomerOption[];
  categories: string[];
  purities: string[];
}

export function CreateOrderWizard({
  customers = [],
  categories = [],
  purities = [],
}: CreateOrderWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get("customerId") || "";

  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Step 1: Customer Selection or Quick Add
  const [customerId, setCustomerId] = React.useState<string>(preselectedCustomerId);
  const [customerSearch, setCustomerSearch] = React.useState<string>("");
  const [isQuickAddingCustomer, setIsQuickAddingCustomer] = React.useState(false);
  const [newCustName, setNewCustName] = React.useState("");
  const [newCustPhone, setNewCustPhone] = React.useState("");
  const [newCustCity, setNewCustCity] = React.useState("");

  // Step 2: Order Type & Details
  const [orderType, setOrderType] = React.useState<"PROJECT" | "PIECE">("PIECE");
  const [projectName, setProjectName] = React.useState("");
  const [orderDate, setOrderDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [expectedDeliveryDate, setExpectedDeliveryDate] = React.useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]
  );
  const [priority, setPriority] = React.useState<"NORMAL" | "URGENT">("NORMAL");
  const [orderRemarks, setOrderRemarks] = React.useState("");
  const [designReferences, setDesignReferences] = React.useState<PhotoInput[]>([]);

  // Step 3: Pieces List
  const defaultCategory = categories[0] || "Ring";
  const defaultPurity = purities[0] || "22K (916)";

  const [pieces, setPieces] = React.useState<PieceFormState[]>([
    {
      category: defaultCategory,
      description: "",
      metal: "Gold",
      purity: defaultPurity,
      size: "",
      quantity: 1,
      stoneDetails: "",
      estimatedWeightMg: 0,
      specifications: "",
      photos: [],
      dueDate: expectedDeliveryDate,
      remarks: "Initial piece specification",
    },
  ]);

  // Keep due dates in sync if delivery date changes
  React.useEffect(() => {
    setPieces((prev) =>
      prev.map((p) => ({ ...p, dueDate: p.dueDate || expectedDeliveryDate }))
    );
  }, [expectedDeliveryDate]);

  // When switching between PROJECT and PIECE
  const handleTypeChange = (type: "PROJECT" | "PIECE") => {
    setOrderType(type);
    if (type === "PIECE" && pieces.length > 1) {
      setPieces([pieces[0]]);
      toast.info("Switched to PIECE order (locked to 1 piece).");
    }
  };

  const handleAddPiece = () => {
    if (orderType === "PIECE") {
      toast.error("PIECE order is locked to 1 piece. Change to PROJECT order for multiple pieces.");
      return;
    }
    setPieces((prev) => [
      ...prev,
      {
        category: defaultCategory,
        description: "",
        metal: "Gold",
        purity: defaultPurity,
        size: "",
        quantity: 1,
        stoneDetails: "",
        estimatedWeightMg: 0,
        specifications: "",
        photos: [],
        dueDate: expectedDeliveryDate,
        remarks: "Piece specification",
      },
    ]);
  };

  const handleRemovePiece = (index: number) => {
    if (pieces.length === 1) {
      toast.error("At least one piece is required.");
      return;
    }
    setPieces((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updatePieceField = (
    index: number,
    field: keyof PieceFormState,
    value: any
  ) => {
    setPieces((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) {
      toast.error("Name and phone are required");
      return;
    }

    try {
      const res = await createCustomer({
        name: newCustName,
        phone: newCustPhone,
        city: newCustCity,
        altPhone: "",
        address: "",
        gstin: "",
        notes: "",
        photos: [],
      });

      if (res.ok) {
        toast.success(`Customer ${newCustName} created!`);
        setCustomerId(res.data.id);
        setIsQuickAddingCustomer(false);
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Failed to add customer");
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch) ||
      c.code.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const selectedCustomer = customers.find((c) => c.id === customerId);

  // Validation before advancing
  const canProceedStep1 = !!customerId;

  const canProceedStep2 =
    orderRemarks.trim().length >= 3 &&
    (orderType === "PIECE" || projectName.trim().length >= 2);

  const handleSubmitOrder = async () => {
    // Validate all pieces
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (!p.description || p.description.trim().length < 2) {
        toast.error(`Piece #${i + 1}: Description is required.`);
        return;
      }
      if (!p.estimatedWeightMg || p.estimatedWeightMg <= 0) {
        toast.error(`Piece #${i + 1}: Estimated weight must be greater than 0.`);
        return;
      }
      if (!p.remarks || p.remarks.trim().length < 3) {
        toast.error(`Piece #${i + 1}: Remarks are mandatory (min 3 chars).`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await createOrder({
        type: orderType,
        customerId,
        projectName: orderType === "PROJECT" ? projectName : "",
        orderDate,
        expectedDeliveryDate,
        priority,
        remarks: orderRemarks,
        photos: [],
        designReferences,
        pieces: pieces.map((p) => ({
          category: p.category,
          description: p.description,
          metal: p.metal,
          purity: p.purity,
          size: p.size,
          quantity: p.quantity,
          stoneDetails: p.stoneDetails,
          estimatedWeightMg: p.estimatedWeightMg,
          specifications: p.specifications,
          photos: p.photos,
          dueDate: p.dueDate,
          remarks: p.remarks,
        })),
      });

      if (res.ok) {
        toast.success(res.message || "Order created successfully!");
        router.push(`/orders/${res.data.orderId}`);
      } else {
        toast.error(res.error || "Failed to create order");
      }
    } catch (err: any) {
      toast.error("Failed to submit order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Wizard Step Indicator */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-amber-600" />
            Create Jewellery Order
          </h1>
          <p className="text-xs text-neutral-500">
            Step {step} of 3: {step === 1 ? "Select Customer" : step === 2 ? "Order Details & Type" : "Configure Pieces & Weights"}
          </p>
        </div>

        {/* Stepper Pills */}
        <div className="flex items-center gap-2 text-xs">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full font-bold ${
              step >= 1
                ? "bg-amber-600 text-white"
                : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800"
            }`}
          >
            {step > 1 ? <Check className="h-4 w-4" /> : 1}
          </div>
          <span className="hidden sm:inline text-neutral-400">→</span>
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full font-bold ${
              step >= 2
                ? "bg-amber-600 text-white"
                : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800"
            }`}
          >
            {step > 2 ? <Check className="h-4 w-4" /> : 2}
          </div>
          <span className="hidden sm:inline text-neutral-400">→</span>
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full font-bold ${
              step >= 3
                ? "bg-amber-600 text-white"
                : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800"
            }`}
          >
            3
          </div>
        </div>
      </div>

      {/* STEP 1: CUSTOMER SELECTION */}
      {step === 1 && (
        <Card className="border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-amber-600" />
              Step 1: Choose or Register Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isQuickAddingCustomer ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Search existing customer by name, phone or code..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsQuickAddingCustomer(true)}
                    className="h-9 text-xs shrink-0"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Quick Add Customer
                  </Button>
                </div>

                {/* Customer List Radio Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pt-1">
                  {filteredCustomers.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setCustomerId(c.id)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                        customerId === c.id
                          ? "border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 font-semibold"
                          : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800"
                      }`}
                    >
                      <div>
                        <p className="text-neutral-900 dark:text-neutral-100">
                          {c.name}
                        </p>
                        <p className="text-[11px] text-neutral-500 font-mono">
                          {c.phone} {c.city ? `• ${c.city}` : ""}
                        </p>
                      </div>
                      <span className="font-mono text-[10px] text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded">
                        {c.code}
                      </span>
                    </div>
                  ))}
                </div>

                {selectedCustomer && (
                  <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800">
                    Selected: <strong>{selectedCustomer.name}</strong> ({selectedCustomer.phone}, {selectedCustomer.code})
                  </div>
                )}
              </div>
            ) : (
              /* Quick Add Customer Sub-form */
              <form onSubmit={handleQuickAddCustomer} className="space-y-3 bg-neutral-50 p-4 rounded-xl border border-neutral-200 dark:bg-neutral-800/60 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Quick Register Customer
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsQuickAddingCustomer(false)}
                    className="h-6 text-[11px]"
                  >
                    Cancel
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Full Name *"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    required
                    className="h-8 text-xs"
                  />
                  <Input
                    placeholder="Mobile Number *"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    required
                    className="h-8 text-xs"
                  />
                </div>
                <Input
                  placeholder="City (e.g. Mumbai)"
                  value={newCustCity}
                  onChange={(e) => setNewCustCity(e.target.value)}
                  className="h-8 text-xs"
                />

                <Button type="submit" variant="gold" size="sm" className="h-8 text-xs">
                  Save & Select Customer
                </Button>
              </form>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="gold"
                size="sm"
                disabled={!canProceedStep1}
                onClick={() => setStep(2)}
                className="text-xs"
              >
                Proceed to Order Details <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: ORDER TYPE & METADATA */}
      {step === 2 && (
        <Card className="border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-amber-600" />
              Step 2: Order Type & Specifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Order Type Toggle: PROJECT vs PIECE */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Order Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => handleTypeChange("PIECE")}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all space-y-1 ${
                    orderType === "PIECE"
                      ? "border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 ring-1 ring-amber-500 font-semibold"
                      : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800"
                  }`}
                >
                  <p className="text-neutral-900 dark:text-neutral-100 font-bold">
                    PIECE Order
                  </p>
                  <p className="text-[11px] text-neutral-500 font-normal">
                    Single individual item (e.g. one diamond solitaire ring or one pendant).
                  </p>
                </div>

                <div
                  onClick={() => handleTypeChange("PROJECT")}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all space-y-1 ${
                    orderType === "PROJECT"
                      ? "border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 ring-1 ring-amber-500 font-semibold"
                      : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800"
                  }`}
                >
                  <p className="text-neutral-900 dark:text-neutral-100 font-bold">
                    PROJECT Order
                  </p>
                  <p className="text-[11px] text-neutral-500 font-normal">
                    Collection / Bridal set containing multiple pieces (e.g. necklace, earrings, bangles).
                  </p>
                </div>
              </div>
            </div>

            {/* Project Name (Required if PROJECT) */}
            {orderType === "PROJECT" && (
              <div className="space-y-1 animate-in fade-in-50">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Project / Set Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Singhania Royal Emerald Bridal Set"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
            )}

            {/* Dates & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Order Date
                </label>
                <Input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Expected Delivery Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="h-9 w-full rounded-md border border-neutral-300 bg-transparent px-3 text-xs dark:border-neutral-700"
                >
                  <option value="NORMAL">NORMAL</option>
                  <option value="URGENT">URGENT (Fast Track)</option>
                </select>
              </div>
            </div>

            {/* Mandatory Remarks */}
            <RemarksField
              value={orderRemarks}
              onChange={setOrderRemarks}
              label="Order Instructions & Customer Remarks"
              placeholder="Enter mandatory order notes and customer special requests (min 3 chars)..."
              required
              minChars={3}
            />

            {/* Design References Photos */}
            <PhotoUploader
              photos={designReferences}
              onChange={setDesignReferences}
              label="Design References & Customer Sketches (Optional)"
            />

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                className="text-xs"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
              </Button>
              <Button
                variant="gold"
                size="sm"
                disabled={!canProceedStep2}
                onClick={() => setStep(3)}
                className="text-xs"
              >
                Configure Pieces ({pieces.length}) <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: PIECES CONFIGURATION */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Gem className="h-4 w-4 text-amber-600" />
              Pieces in this Order ({pieces.length})
            </h3>

            {orderType === "PROJECT" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPiece}
                className="text-xs h-8"
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Another Piece
              </Button>
            )}
          </div>

          {pieces.map((piece, index) => (
            <Card
              key={index}
              className="border-neutral-200/80 dark:border-neutral-800 shadow-2xs relative"
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] dark:bg-amber-950">
                    {index + 1}
                  </span>
                  Piece #{index + 1}: {piece.category}
                </CardTitle>

                {orderType === "PROJECT" && pieces.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePiece(index)}
                    className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove Piece
                  </button>
                )}
              </CardHeader>

              <CardContent className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={piece.category}
                      onChange={(e) => updatePieceField(index, "category", e.target.value)}
                      className="h-9 w-full rounded-md border border-neutral-300 bg-transparent px-3 text-xs dark:border-neutral-700"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                      Metal
                    </label>
                    <select
                      value={piece.metal}
                      onChange={(e) => updatePieceField(index, "metal", e.target.value as any)}
                      className="h-9 w-full rounded-md border border-neutral-300 bg-transparent px-3 text-xs dark:border-neutral-700"
                    >
                      <option value="Gold">Gold</option>
                      <option value="Silver">Silver</option>
                      <option value="Platinum">Platinum</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                      Purity <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={piece.purity}
                      onChange={(e) => updatePieceField(index, "purity", e.target.value)}
                      className="h-9 w-full rounded-md border border-neutral-300 bg-transparent px-3 text-xs dark:border-neutral-700"
                    >
                      {purities.map((pur) => (
                        <option key={pur} value={pur}>
                          {pur}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Piece Description <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Handcrafted choker with emerald drops and uncut diamond setting"
                    value={piece.description}
                    onChange={(e) => updatePieceField(index, "description", e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                      Size / Dimension
                    </label>
                    <Input
                      placeholder="e.g. 14, 2.4, 16 inches"
                      value={piece.size}
                      onChange={(e) => updatePieceField(index, "size", e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                      Stone / Gem Details
                    </label>
                    <Input
                      placeholder="e.g. 1.20ct Natural Emeralds, VVS Diamonds"
                      value={piece.stoneDetails}
                      onChange={(e) => updatePieceField(index, "stoneDetails", e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  {/* Weight Input (Milligrams stored, Grams displayed) */}
                  <WeightInput
                    valueMg={piece.estimatedWeightMg}
                    onChangeMg={(mg) => updatePieceField(index, "estimatedWeightMg", mg)}
                    label="Estimated Weight"
                    required
                  />
                </div>

                {/* Piece Verification Photos */}
                <PhotoUploader
                  photos={piece.photos}
                  onChange={(photos) => updatePieceField(index, "photos", photos)}
                  label={`Piece #${index + 1} Photos`}
                  required
                />

                {/* Piece Remarks */}
                <RemarksField
                  value={piece.remarks}
                  onChange={(val) => updatePieceField(index, "remarks", val)}
                  label={`Piece #${index + 1} Remarks`}
                  placeholder="Manufacturing notes (min 3 chars)..."
                  required
                />
              </CardContent>
            </Card>
          ))}

          {/* Wizard Footer Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(2)}
              disabled={isSubmitting}
              className="text-xs"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Details
            </Button>

            <Button
              variant="gold"
              size="sm"
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              className="text-xs h-10 px-6"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Order & Piece References...
                </>
              ) : (
                <>
                  <Check className="mr-1.5 h-4 w-4" />
                  Confirm & Create Order ({pieces.length} Pieces)
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
