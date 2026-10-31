// Domain model for the jewellery manufacturing BMS.
// All weights are integer milligrams (1 g = 1000 mg) to avoid float drift.

export type Role = "OWNER" | "MANAGER" | "STAFF" | "KARIGAR";

export type PhotoKind = "reference" | "design" | "progress" | "submission" | "jobwork" | "final" | "delivery";

export interface Photo {
  id: string;
  url: string;
  caption?: string;
  kind: PhotoKind;
  by: string;
  at: string;
}

/** System meaning behind a user-defined status label. Business logic only reads categories. */
export type OrderCategory = "NEW" | "ACTIVE" | "HOLD" | "READY" | "PARTIAL" | "DONE" | "CANCELLED";
export type WorkCategory = "ISSUED" | "ACTIVE" | "HOLD" | "SUBMITTED" | "REWORK" | "DONE";
export type JobCategory = "SENT" | "ACTIVE" | "HOLD" | "RETURNED";

export interface StatusOption<C extends string = string> {
  id: string;
  label: string;
  color: string;
  category: C;
}

export interface Stage {
  id: string;
  name: string;
  color: string;
  /** Who usually handles it: karigar at the bench, outside vendor, or in-house team. */
  handledBy: "ARTISAN" | "JOBWORK" | "INHOUSE";
}

export interface Vendor {
  id: string;
  name: string;
  phone: string;
  city: string;
  processes: string[];
}

/** Metal of an order, with the purities offered for it. */
export interface MetalOption {
  name: string;
  purities: string[];
}

export interface Permissions {
  [perm: string]: { MANAGER: boolean; STAFF: boolean };
}

export interface Settings {
  company: { name: string; tagline: string; address: string; phone: string; email: string; gstin: string };
  weightTolerancePct: number;
  stages: Stage[];
  orderStatuses: StatusOption<OrderCategory>[];
  workStatuses: StatusOption<WorkCategory>[];
  jobStatuses: StatusOption<JobCategory>[];
  categories: string[];
  metals: MetalOption[];
  processes: string[];
  vendors: Vendor[];
  permissions: Permissions;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  title: string;
  phone: string;
  artisanId?: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
  city: string;
  email?: string;
  type: "Retail" | "Showroom" | "Wholesale";
  notes?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  number: string;
  type: "PROJECT" | "PIECE";
  title: string;
  customerId: string;
  orderDate: string;
  dueDate: string;
  priority: "Normal" | "Urgent" | "VIP";
  /** Gold / Silver / Copper … (Settings → Masters → Metals) */
  metal: string;
  statusId: string;
  remarks: string;
  photos: Photo[];
  createdBy: string;
  createdAt: string;
}

export type PieceLocation = "OFFICE" | "ARTISAN" | "JOBWORK" | "READY" | "DELIVERED";

export interface Piece {
  id: string;
  code: string;
  orderId: string;
  name: string;
  category: string;
  purity: string;
  size?: string;
  qty: number;
  specs: string;
  stones?: string;
  estWeightMg: number;
  /** estimated value in rupees, used on challans */
  valueRs?: number;
  /** latest physically measured weight (moves along the workflow) */
  currentWeightMg?: number;
  finalWeightMg?: number;
  stageId: string;
  location: PieceLocation;
  artisanId?: string;
  photos: Photo[];
  remarks: string;
  receivedAt: string;
  readyAt?: string;
  deliveredAt?: string;
}

export interface Artisan {
  id: string;
  code: string;
  name: string;
  phone: string;
  speciality: string;
  city: string;
  joinedAt: string;
  active: boolean;
  hue: number;
}

export interface WorkUpdate {
  id: string;
  at: string;
  by: string;
  percent: number;
  note: string;
  photos: Photo[];
}

export interface WorkOrder {
  id: string;
  number: string;
  pieceId: string;
  artisanId: string;
  stageId: string;
  statusId: string;
  issuedAt: string;
  dueDate: string;
  issuedWeightMg: number;
  instructions: string;
  remarks: string;
  updates: WorkUpdate[];
  submittedAt?: string;
  submittedWeightMg?: number;
  submissionPhotos: Photo[];
  submissionNote?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export interface JobWork {
  id: string;
  number: string;
  pieceId: string;
  vendorId: string;
  process: string;
  statusId: string;
  dispatchDate: string;
  /** when the dispatch was recorded (dispatchDate is user-entered) */
  sentAt: string;
  expectedDate: string;
  sentWeightMg: number;
  returnedAt?: string;
  returnedWeightMg?: number;
  charges?: number;
  remarks: string;
  returnRemarks?: string;
  photos: Photo[];
}

export interface Delivery {
  id: string;
  number: string;
  orderId: string;
  customerId: string;
  items: { pieceId: string; weightMg: number }[];
  date: string;
  mode: "Hand delivery" | "Courier" | "Showroom pickup";
  receivedBy: string;
  remarks: string;
  photos: Photo[];
}

/** Delivery / road challan: goods leaving the premises, with weight and value. */
export interface Challan {
  id: string;
  number: string;
  orderId: string;
  customerId: string;
  date: string;
  items: { pieceId: string; weightMg: number; valueRs: number }[];
  mode: "By hand" | "Road transport" | "Courier";
  vehicleNo?: string;
  transporter?: string;
  fromPlace: string;
  toPlace: string;
  remarks: string;
  createdBy: string;
}

export interface Activity {
  id: string;
  at: string;
  by: string;
  icon: "order" | "assign" | "submit" | "approve" | "rework" | "jobout" | "jobin" | "deliver" | "challan" | "status" | "photo" | "stage" | "note" | "ready";
  text: string;
  remarks?: string;
  orderId?: string;
  pieceId?: string;
  /** multi-piece events (deliveries) */
  pieceIds?: string[];
  artisanId?: string;
  weightMg?: number;
  photos?: Photo[];
}

export interface DB {
  version: number;
  seededAt: string;
  settings: Settings;
  users: User[];
  customers: Customer[];
  orders: Order[];
  pieces: Piece[];
  artisans: Artisan[];
  workOrders: WorkOrder[];
  jobWorks: JobWork[];
  deliveries: Delivery[];
  challans: Challan[];
  activity: Activity[];
  counters: Record<string, number>;
}
