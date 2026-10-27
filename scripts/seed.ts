import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../src/models/User";
import { Customer } from "../src/models/Customer";
import { Order } from "../src/models/Order";
import { OrderItem } from "../src/models/OrderItem";
import { Artisan } from "../src/models/Artisan";
import { ProductionStage } from "../src/models/ProductionStage";
import { StatusOption } from "../src/models/StatusOption";
import { Assignment } from "../src/models/Assignment";
import { ProgressUpdate } from "../src/models/ProgressUpdate";
import { JobWorkVendor } from "../src/models/JobWorkVendor";
import { JobWork } from "../src/models/JobWork";
import { Delivery } from "../src/models/Delivery";
import { ActivityLog } from "../src/models/ActivityLog";
import { Counter } from "../src/models/Counter";
import { Settings } from "../src/models/Settings";
import { DEFAULT_PERMISSION_MATRIX } from "../src/lib/rbac";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bms_jewellery";

// Clean placeholder jewellery images from Unsplash
const JEWEL_PHOTOS = {
  ring: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80",
  necklace: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80",
  earrings: "https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=600&q=80",
  bangles: "https://images.unsplash.com/photo-1611591475152-473523dd66c8?auto=format&fit=crop&w=600&q=80",
  pendant: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=600&q=80",
  artisan1: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
  artisan2: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
  artisan3: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80",
};

async function seed() {
  console.log("Connecting to MongoDB for seeding:", MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully!");

  console.log("Clearing existing collections...");
  await Promise.all([
    User.deleteMany({}),
    Customer.deleteMany({}),
    Order.deleteMany({}),
    OrderItem.deleteMany({}),
    Artisan.deleteMany({}),
    ProductionStage.deleteMany({}),
    StatusOption.deleteMany({}),
    Assignment.deleteMany({}),
    ProgressUpdate.deleteMany({}),
    JobWorkVendor.deleteMany({}),
    JobWork.deleteMany({}),
    Delivery.deleteMany({}),
    ActivityLog.deleteMany({}),
    Counter.deleteMany({}),
    Settings.deleteMany({}),
  ]);

  console.log("1. Seeding Settings & Masters...");
  const settings = await Settings.create({
    companyName: "BMS Fine Jewellery Manufacturers",
    tagline: "Handcrafted Luxury & Master Jewellery Production",
    logoUrl: "",
    address: "45, Zaveri Bazaar, Kalbadevi",
    city: "Mumbai, Maharashtra - 400002",
    phone: "+91 98200 12345",
    email: "production@bmsjewels.com",
    gstin: "27AAAAA0000A1Z5",
    weightTolerancePercent: 0.5,
    photoRequired: {
      pieceCreation: true,
      karigarSubmission: true,
      jobWorkReturn: true,
      delivery: true,
    },
    categories: [
      "Ring",
      "Necklace",
      "Earrings",
      "Bangles",
      "Bracelet",
      "Pendant",
      "Chain",
      "Mangalsutra",
      "Bridal Set",
      "Kada",
      "Nose Pin",
    ],
    purities: [
      "22K (916)",
      "18K (750)",
      "14K (585)",
      "24K (999)",
      "925 Sterling Silver",
      "Platinum 950",
    ],
    processTypes: [
      "Polishing",
      "Finishing",
      "Rhodium Plating",
      "Gold Flash Plating",
      "Laser Engraving",
      "Micro Setting",
      "Meenakari / Enameling",
    ],
    numberingPrefixes: {
      order: "ORD",
      workOrder: "WO",
      jobWork: "JW",
      delivery: "DEL",
      customer: "CUS",
      artisan: "KAR",
    },
    pdfFooterText:
      "BMS Jewellery Manufacturing — Confidential & Internal Production Record. Computer generated.",
    permissionMatrix: DEFAULT_PERMISSION_MATRIX,
  });

  console.log("2. Seeding Production Stages...");
  const stageDefs = [
    { name: "Design / CAD", sortOrder: 1, colour: "#3b82f6" },
    { name: "Casting", sortOrder: 2, colour: "#f59e0b" },
    { name: "Filing & Assembly", sortOrder: 3, colour: "#8b5cf6" },
    { name: "Stone Setting", sortOrder: 4, colour: "#ec4899" },
    { name: "Polishing & Finishing", sortOrder: 5, colour: "#10b981" },
    { name: "Quality Check", sortOrder: 6, colour: "#06b6d4" },
    { name: "Ready for Delivery", sortOrder: 7, colour: "#22c55e" },
  ];
  const stages = await ProductionStage.insertMany(stageDefs);

  console.log("3. Seeding Status Options...");
  const statusDefs = [
    // Order Statuses
    { scope: "ORDER", name: "Received", colour: "#f59e0b", systemCategory: "PENDING", sortOrder: 1, isDefault: true },
    { scope: "ORDER", name: "In Workshop", colour: "#3b82f6", systemCategory: "IN_PRODUCTION", sortOrder: 2 },
    { scope: "ORDER", name: "Outside Finishing", colour: "#8b5cf6", systemCategory: "AT_JOB_WORK", sortOrder: 3 },
    { scope: "ORDER", name: "Ready in Showroom", colour: "#10b981", systemCategory: "READY", sortOrder: 4 },
    { scope: "ORDER", name: "Delivered to Customer", colour: "#06b6d4", systemCategory: "DELIVERED", sortOrder: 5 },
    { scope: "ORDER", name: "On Hold", colour: "#6b7280", systemCategory: "ON_HOLD", sortOrder: 6 },
    { scope: "ORDER", name: "Cancelled", colour: "#ef4444", systemCategory: "CANCELLED", sortOrder: 7 },

    // Piece Statuses
    { scope: "PIECE", name: "Assigned / In Hand", colour: "#3b82f6", systemCategory: "IN_PRODUCTION", sortOrder: 1, isDefault: true },
    { scope: "PIECE", name: "Pending Karigar", colour: "#f59e0b", systemCategory: "PENDING", sortOrder: 2 },
    { scope: "PIECE", name: "Sent for Polishing", colour: "#8b5cf6", systemCategory: "AT_JOB_WORK", sortOrder: 3 },
    { scope: "PIECE", name: "Passed QC / Ready", colour: "#10b981", systemCategory: "READY", sortOrder: 4 },
    { scope: "PIECE", name: "Delivered", colour: "#06b6d4", systemCategory: "DELIVERED", sortOrder: 5 },

    // Assignment Statuses
    { scope: "ASSIGNMENT", name: "Work In Progress", colour: "#3b82f6", systemCategory: "IN_PRODUCTION", sortOrder: 1, isDefault: true },
    { scope: "ASSIGNMENT", name: "Under Verification", colour: "#f59e0b", systemCategory: "PENDING", sortOrder: 2 },
    { scope: "ASSIGNMENT", name: "Completed & Verified", colour: "#10b981", systemCategory: "READY", sortOrder: 3 },

    // JobWork Statuses
    { scope: "JOBWORK", name: "Dispatched", colour: "#8b5cf6", systemCategory: "AT_JOB_WORK", sortOrder: 1, isDefault: true },
    { scope: "JOBWORK", name: "Partially Returned", colour: "#f59e0b", systemCategory: "IN_PRODUCTION", sortOrder: 2 },
    { scope: "JOBWORK", name: "Fully Returned", colour: "#10b981", systemCategory: "READY", sortOrder: 3 },
  ];
  const statuses = await StatusOption.insertMany(statusDefs);

  console.log("4. Seeding Users (Owner, Manager, Staff, Karigars)...");
  const defaultPasswordHash = await bcrypt.hash("Owner@123", 10);
  const managerPasswordHash = await bcrypt.hash("Manager@123", 10);
  const staffPasswordHash = await bcrypt.hash("Staff@123", 10);
  const karigarPinHash = await bcrypt.hash("1234", 10);

  const ownerUser = await User.create({
    name: "Amit Roy (Owner)",
    phone: "9820011111",
    email: "owner@bms.local",
    passwordHash: defaultPasswordHash,
    role: "OWNER",
    isActive: true,
  });

  const managerUser = await User.create({
    name: "Rajesh Soni (Manager)",
    phone: "9820022222",
    email: "manager@bms.local",
    passwordHash: managerPasswordHash,
    role: "MANAGER",
    isActive: true,
  });

  const staffUser = await User.create({
    name: "Pooja Mehta (Staff)",
    phone: "9820033333",
    email: "staff@bms.local",
    passwordHash: staffPasswordHash,
    role: "STAFF",
    isActive: true,
  });

  console.log("5. Seeding Artisans (Karigars)...");
  const artisanDefs = [
    {
      code: "KAR-001",
      name: "Ramesh Verma",
      phone: "9820044441",
      address: "Shop 12, Charni Road, Mumbai",
      speciality: ["Casting", "Plain Gold", "Filing"],
      photo: { publicId: "artisan_1", url: JEWEL_PHOTOS.artisan1, caption: "Master Craftsman" },
      notes: "Expert in heavy bridal necklace frames",
    },
    {
      code: "KAR-002",
      name: "Suresh Mondal",
      phone: "9820044442",
      address: "24, Bowbazar Lane, Zaveri Bazaar",
      speciality: ["Stone Setting", "Jadau", "Filing"],
      photo: { publicId: "artisan_2", url: JEWEL_PHOTOS.artisan2, caption: "Stone Setting Specialist" },
      notes: "Precision prong and pave setter",
    },
    {
      code: "KAR-003",
      name: "Anil Patra",
      phone: "9820044443",
      address: "5, Kalbadevi Rd, Mumbai",
      speciality: ["Micro Setting", "Meenakari / Enameling"],
      photo: { publicId: "artisan_3", url: JEWEL_PHOTOS.artisan3, caption: "Enameler" },
      notes: "Traditional meenakari artisan",
    },
  ];

  const artisans = [];
  for (const def of artisanDefs) {
    const art = await Artisan.create({
      ...def,
      createdBy: ownerUser._id,
    });

    // Create Karigar login User with PIN 1234
    const kUser = await User.create({
      name: def.name,
      phone: def.phone,
      pinHash: karigarPinHash,
      role: "KARIGAR",
      artisanId: art._id,
      isActive: true,
      createdBy: ownerUser._id,
    });

    art.userId = kUser._id as any;
    await art.save();
    artisans.push(art);
  }

  console.log("6. Seeding Job Work Vendors...");
  const vendors = await JobWorkVendor.insertMany([
    {
      name: "Shree Radhe Polishing Works",
      processTypes: ["Polishing", "Finishing"],
      phone: "9830055551",
      address: "Gala 4, Sheikh Memon St, Zaveri Bazaar, Mumbai",
      createdBy: ownerUser._id,
    },
    {
      name: "Golden Touch Rhodium & Plating",
      processTypes: ["Rhodium Plating", "Gold Flash Plating", "Laser Engraving"],
      phone: "9830055552",
      address: "2nd Floor, Tribhuvan Rd, Mumbai",
      createdBy: ownerUser._id,
    },
  ]);

  console.log("7. Seeding 8 Customers...");
  const customerDefs = [
    { code: "CUS-0001", name: "Ananya Singhania", phone: "9811122201", email: "ananya@singhania.com", city: "Mumbai", notes: "VIP Bridal Client" },
    { code: "CUS-0002", name: "Kunal Deshmukh", phone: "9811122202", email: "kunal.d@gmail.com", city: "Pune", notes: "Engagement ring buyer" },
    { code: "CUS-0003", name: "Meera Agarwal", phone: "9811122203", email: "meera.agarwal@outlook.com", city: "Surat", notes: "Custom bangle orders" },
    { code: "CUS-0004", name: "Vikramaditya Rao", phone: "9811122204", email: "vikram@raoestates.in", city: "Hyderabad", notes: "Traditional polki set" },
    { code: "CUS-0005", name: "Sunita Parekh", phone: "9811122205", email: "sparekh@gmail.com", city: "Ahmedabad", notes: "Diwali family jewellery" },
    { code: "CUS-0006", name: "Rohan Kapoor", phone: "9811122206", email: "rohan.kapoor@gmail.com", city: "Delhi", notes: "Men's platinum chain & bracelet" },
    { code: "CUS-0007", name: "Priyanka Joshi", phone: "9811122207", email: "p.joshi@gmail.com", city: "Mumbai", notes: "Anniversary earrings" },
    { code: "CUS-0008", name: "Harishchandra Jain", phone: "9811122208", email: "hjain@jaingroup.com", city: "Jaipur", notes: "Temple jewellery collector" },
  ];
  const customers = await Customer.insertMany(customerDefs);

  console.log("8. Seeding Orders and Pieces across stages...");

  // ORDER 1: PROJECT Order - Singhania Bridal Set (3 pieces: Necklace, Earrings, Bangles)
  const ord1Date = new Date(Date.now() - 15 * 86400000);
  const ord1Due = new Date(Date.now() + 10 * 86400000);
  const ord1 = await Order.create({
    orderNo: "ORD-2026-0001",
    type: "PROJECT",
    customerId: customers[0]._id,
    projectName: "Singhania Royal Kundan Bridal Set",
    orderDate: ord1Date,
    expectedDeliveryDate: ord1Due,
    priority: "URGENT",
    statusId: statuses[1]._id, // In Workshop
    systemStatus: "IN_PRODUCTION",
    totalEstimatedWeightMg: 125500, // 125.500g
    remarks: "High priority wedding set. Delivery deadline strict.",
    photos: [{ publicId: "ord1_ref", url: JEWEL_PHOTOS.necklace, caption: "Customer sketch approval" }],
    itemCount: 3,
    deliveredCount: 0,
    createdBy: ownerUser._id,
  });

  const p1 = await OrderItem.create({
    pieceNo: "ORD-2026-0001/01",
    orderId: ord1._id,
    customerId: customers[0]._id,
    category: "Necklace",
    description: "Royal Choker with Emerald beads & uncut diamonds",
    metal: "Gold",
    purity: "22K (916)",
    estimatedWeightMg: 75000,
    photos: [{ publicId: "p1_img", url: JEWEL_PHOTOS.necklace, caption: "Design CAD view" }],
    currentStageId: stages[3]._id, // Stone Setting
    systemStatus: "IN_PRODUCTION",
    currentLocation: "WITH_KARIGAR",
    currentArtisanId: artisans[1]._id, // Suresh Mondal
    dueDate: ord1Due,
    remarks: "Ensure solid back frame for heavy gemstones",
    createdBy: ownerUser._id,
  });

  const p2 = await OrderItem.create({
    pieceNo: "ORD-2026-0001/02",
    orderId: ord1._id,
    customerId: customers[0]._id,
    category: "Earrings",
    description: "Matching chandelier Jhumkas with South Sea pearls",
    metal: "Gold",
    purity: "22K (916)",
    estimatedWeightMg: 28500,
    photos: [{ publicId: "p2_img", url: JEWEL_PHOTOS.earrings, caption: "Earring pair 3D render" }],
    currentStageId: stages[2]._id, // Filing
    systemStatus: "IN_PRODUCTION",
    currentLocation: "WITH_KARIGAR",
    currentArtisanId: artisans[0]._id, // Ramesh Verma
    dueDate: ord1Due,
    remarks: "Match drop length to 6.5 cm",
    createdBy: ownerUser._id,
  });

  const p3 = await OrderItem.create({
    pieceNo: "ORD-2026-0001/03",
    orderId: ord1._id,
    customerId: customers[0]._id,
    category: "Bangles",
    description: "Pair of antique handcrafted gold kada bangles (size 2.4)",
    metal: "Gold",
    purity: "22K (916)",
    estimatedWeightMg: 22000,
    photos: [{ publicId: "p3_img", url: JEWEL_PHOTOS.bangles, caption: "Kada embossing reference" }],
    currentStageId: stages[4]._id, // Polishing
    systemStatus: "AT_JOB_WORK",
    currentLocation: "AT_JOB_WORK",
    dueDate: ord1Due,
    remarks: "High antique polish required",
    createdBy: ownerUser._id,
  });

  // ORDER 2: PIECE Order - Kunal Deshmukh Solitaire Ring (Overdue piece)
  const ord2Date = new Date(Date.now() - 20 * 86400000);
  const ord2Due = new Date(Date.now() - 2 * 86400000); // 2 days overdue
  const ord2 = await Order.create({
    orderNo: "ORD-2026-0002",
    type: "PIECE",
    customerId: customers[1]._id,
    orderDate: ord2Date,
    expectedDeliveryDate: ord2Due,
    priority: "NORMAL",
    statusId: statuses[1]._id,
    systemStatus: "IN_PRODUCTION",
    totalEstimatedWeightMg: 8200,
    remarks: "Engagement ring for proposal",
    photos: [{ publicId: "ord2_ring", url: JEWEL_PHOTOS.ring, caption: "Solitaire 4-prong ring" }],
    itemCount: 1,
    deliveredCount: 0,
    createdBy: staffUser._id,
  });

  const p4 = await OrderItem.create({
    pieceNo: "ORD-2026-0002/01",
    orderId: ord2._id,
    customerId: customers[1]._id,
    category: "Ring",
    description: "Platinum & 18K Yellow Gold 1.5ct Solitaire Ring",
    metal: "Platinum",
    purity: "Platinum 950",
    size: "14",
    quantity: 1,
    estimatedWeightMg: 8200,
    photos: [{ publicId: "p4_ring", url: JEWEL_PHOTOS.ring, caption: "Casting raw piece" }],
    currentStageId: stages[3]._id, // Stone Setting
    systemStatus: "IN_PRODUCTION",
    currentLocation: "WITH_KARIGAR",
    currentArtisanId: artisans[1]._id, // Suresh Mondal
    dueDate: ord2Due,
    remarks: "Prongs must be mirror polished before diamond seating",
    createdBy: staffUser._id,
  });

  // ORDER 3: PIECE Order - Meera Agarwal Bangles (Ready in showroom)
  const ord3Date = new Date(Date.now() - 12 * 86400000);
  const ord3Due = new Date(Date.now() + 3 * 86400000);
  const ord3 = await Order.create({
    orderNo: "ORD-2026-0003",
    type: "PIECE",
    customerId: customers[2]._id,
    orderDate: ord3Date,
    expectedDeliveryDate: ord3Due,
    priority: "NORMAL",
    statusId: statuses[3]._id, // Ready in Showroom
    systemStatus: "READY",
    totalEstimatedWeightMg: 35400,
    remarks: "Customer wants notification as soon as ready",
    photos: [{ publicId: "ord3_bangle", url: JEWEL_PHOTOS.bangles, caption: "Sample bangle set" }],
    itemCount: 1,
    deliveredCount: 0,
    createdBy: staffUser._id,
  });

  const p5 = await OrderItem.create({
    pieceNo: "ORD-2026-0003/01",
    orderId: ord3._id,
    customerId: customers[2]._id,
    category: "Bangles",
    description: "Set of 4 lightweight daily wear 22K gold bangles",
    metal: "Gold",
    purity: "22K (916)",
    estimatedWeightMg: 35400,
    finalWeightMg: 35280,
    photos: [{ publicId: "p5_bangle", url: JEWEL_PHOTOS.bangles, caption: "Finished pieces ready" }],
    currentStageId: stages[6]._id, // Ready
    systemStatus: "READY",
    currentLocation: "READY",
    dueDate: ord3Due,
    remarks: "Cleaned, tag affixed, placed in vault tray 4",
    createdBy: staffUser._id,
  });

  // ORDER 4: Completed Order with Delivery - Vikramaditya Rao
  const ord4Date = new Date(Date.now() - 30 * 86400000);
  const ord4Del = new Date(Date.now() - 5 * 86400000);
  const ord4 = await Order.create({
    orderNo: "ORD-2026-0004",
    type: "PIECE",
    customerId: customers[3]._id,
    orderDate: ord4Date,
    expectedDeliveryDate: ord4Del,
    priority: "NORMAL",
    statusId: statuses[4]._id, // Delivered
    systemStatus: "DELIVERED",
    totalEstimatedWeightMg: 18500,
    remarks: "Delivered in person with authentication certificate",
    photos: [{ publicId: "ord4_pendant", url: JEWEL_PHOTOS.pendant, caption: "Temple pendant" }],
    itemCount: 1,
    deliveredCount: 1,
    createdBy: managerUser._id,
  });

  const p6 = await OrderItem.create({
    pieceNo: "ORD-2026-0004/01",
    orderId: ord4._id,
    customerId: customers[3]._id,
    category: "Pendant",
    description: "Goddess Lakshmi Antique Temple Pendant with Ruby eyes",
    metal: "Gold",
    purity: "22K (916)",
    estimatedWeightMg: 18500,
    finalWeightMg: 18450,
    photos: [{ publicId: "p6_pendant", url: JEWEL_PHOTOS.pendant, caption: "Delivered jewellery" }],
    currentStageId: stages[6]._id,
    systemStatus: "DELIVERED",
    currentLocation: "DELIVERED",
    dueDate: ord4Del,
    remarks: "Handed over to customer Mr. Rao",
    createdBy: managerUser._id,
  });

  const del1 = await Delivery.create({
    deliveryNo: "DEL-2026-0001",
    customerId: customers[3]._id,
    orderId: ord4._id,
    items: [{ orderItemId: p6._id, finalWeightMg: 18450 }],
    deliveryDate: ord4Del,
    receivedBy: "Vikramaditya Rao",
    receiverPhone: "9811122204",
    mode: "IN_PERSON",
    photos: [{ publicId: "del1_photo", url: JEWEL_PHOTOS.pendant, caption: "Handover box inspection" }],
    remarks: "Customer verified hallmark and weights. Full payment received.",
    createdBy: managerUser._id,
  });

  // ORDER 5: PROJECT Order - Sunita Parekh (Earrings + Pendant)
  const ord5Date = new Date(Date.now() - 8 * 86400000);
  const ord5Due = new Date(Date.now() + 5 * 86400000);
  const ord5 = await Order.create({
    orderNo: "ORD-2026-0005",
    type: "PROJECT",
    customerId: customers[4]._id,
    projectName: "Parekh Festive Floral Collection",
    orderDate: ord5Date,
    expectedDeliveryDate: ord5Due,
    priority: "NORMAL",
    statusId: statuses[1]._id,
    systemStatus: "IN_PRODUCTION",
    totalEstimatedWeightMg: 34000,
    remarks: "Delicate floral openwork motif",
    itemCount: 2,
    deliveredCount: 0,
    createdBy: staffUser._id,
  });

  const p7 = await OrderItem.create({
    pieceNo: "ORD-2026-0005/01",
    orderId: ord5._id,
    customerId: customers[4]._id,
    category: "Earrings",
    description: "Floral stud tops with hanging South Sea baroque pearl",
    metal: "Gold",
    purity: "18K (750)",
    estimatedWeightMg: 16000,
    photos: [{ publicId: "p7_ear", url: JEWEL_PHOTOS.earrings, caption: "Studs prototype" }],
    currentStageId: stages[2]._id, // Filing
    systemStatus: "IN_PRODUCTION",
    currentLocation: "WITH_KARIGAR",
    currentArtisanId: artisans[0]._id, // Ramesh
    dueDate: ord5Due,
    remarks: "Keep weight balanced so earlobe doesn't sag",
    createdBy: staffUser._id,
  });

  const p8 = await OrderItem.create({
    pieceNo: "ORD-2026-0005/02",
    orderId: ord5._id,
    customerId: customers[4]._id,
    category: "Pendant",
    description: "Central lotus pendant with rubies",
    metal: "Gold",
    purity: "18K (750)",
    estimatedWeightMg: 18000,
    photos: [{ publicId: "p8_pen", url: JEWEL_PHOTOS.pendant, caption: "Pendant sketch" }],
    currentStageId: stages[1]._id, // Casting
    systemStatus: "IN_PRODUCTION",
    currentLocation: "IN_HOUSE",
    dueDate: ord5Due,
    remarks: "Raw casting awaiting filing issue",
    createdBy: staffUser._id,
  });

  // Seed remaining 5 orders to reach total 10 orders and ~25 pieces
  const remainingOrdersData = [
    { no: "ORD-2026-0006", cust: customers[5], cat: "Chain", desc: "Men's Italian Curb Platinum Chain", wt: 42000, daysAgo: 6, dueIn: 12, metal: "Platinum 950" },
    { no: "ORD-2026-0007", cust: customers[6], cat: "Earrings", desc: "Diamond hoop balis with safety lock", wt: 14500, daysAgo: 4, dueIn: 6, metal: "Gold" },
    { no: "ORD-2026-0008", cust: customers[7], cat: "Ring", desc: "Navratna traditional signet ring", wt: 19800, daysAgo: 9, dueIn: 4, metal: "Gold" },
    { no: "ORD-2026-0009", cust: customers[0], cat: "Bangles", desc: "Lightweight twist wire bangles pair", wt: 24000, daysAgo: 3, dueIn: 15, metal: "Gold" },
    { no: "ORD-2026-0010", cust: customers[1], cat: "Necklace", desc: "Contemporary emerald collar necklace", wt: 52000, daysAgo: 2, dueIn: 18, metal: "Gold" },
  ];

  for (const o of remainingOrdersData) {
    const oDate = new Date(Date.now() - o.daysAgo * 86400000);
    const oDue = new Date(Date.now() + o.dueIn * 86400000);

    const ord = await Order.create({
      orderNo: o.no,
      type: "PIECE",
      customerId: o.cust._id,
      orderDate: oDate,
      expectedDeliveryDate: oDue,
      priority: "NORMAL",
      statusId: statuses[0]._id, // Received
      systemStatus: "PENDING",
      totalEstimatedWeightMg: o.wt,
      remarks: `Order recorded for ${o.desc}`,
      photos: [{ publicId: `ref_${o.no}`, url: JEWEL_PHOTOS.ring, caption: "Design approval" }],
      itemCount: 1,
      deliveredCount: 0,
      createdBy: staffUser._id,
    });

    await OrderItem.create({
      pieceNo: `${o.no}/01`,
      orderId: ord._id,
      customerId: o.cust._id,
      category: o.cat,
      description: o.desc,
      metal: o.metal === "Platinum 950" ? "Platinum" : "Gold",
      purity: o.metal === "Platinum 950" ? "Platinum 950" : "22K (916)",
      estimatedWeightMg: o.wt,
      photos: [{ publicId: `piece_${o.no}`, url: JEWEL_PHOTOS.necklace, caption: "Design specs" }],
      currentStageId: stages[0]._id, // CAD
      systemStatus: "PENDING",
      currentLocation: "IN_HOUSE",
      dueDate: oDue,
      remarks: "CAD rendering in review",
      createdBy: staffUser._id,
    });
  }

  console.log("9. Seeding Work Order (Assignment) & Karigar Submissions...");
  const wo1 = await Assignment.create({
    workOrderNo: "WO-2026-0001",
    artisanId: artisans[1]._id, // Suresh Mondal
    items: [
      {
        orderItemId: p1._id,
        stageId: stages[3]._id, // Setting
        issuedWeightMg: 75200,
        instructions: "Seat 42 uncut stones and 8 natural emerald drops",
      },
      {
        orderItemId: p4._id,
        stageId: stages[3]._id, // Setting
        issuedWeightMg: 8250,
        instructions: "Set central solitaire and micro pavé shoulder stones",
      },
    ],
    issueDate: new Date(Date.now() - 5 * 86400000),
    dueDate: ord1Due,
    statusId: statuses[7]._id, // Work In Progress
    issuedBy: managerUser._id,
    remarks: "Urgent wedding pieces. Handle emeralds with utmost care.",
    photos: [{ publicId: "wo1_photo", url: JEWEL_PHOTOS.necklace, caption: "Issued raw pieces" }],
    createdBy: managerUser._id,
  });

  // Karigar submission in review queue (PENDING staff approval)
  const sub1 = await ProgressUpdate.create({
    assignmentId: wo1._id,
    orderItemId: p1._id,
    artisanId: artisans[1]._id,
    stageId: stages[3]._id,
    submittedBy: artisans[1].userId,
    submittedAt: new Date(Date.now() - 1 * 86400000),
    submittedWeightMg: 74980, // 74.980g (mild filing loss)
    completionPercent: 100,
    isStageComplete: true,
    photos: [{ publicId: "sub1_p1", url: JEWEL_PHOTOS.necklace, caption: "Prong setting complete" }],
    remarks: "All 42 stones set securely. Ready for workshop review.",
    verificationStatus: "PENDING",
    createdBy: artisans[1].userId,
  });

  console.log("10. Seeding Job Work Challan with Partial Return...");
  const jw1 = await JobWork.create({
    challanNo: "JW-2026-0001",
    vendorId: vendors[0]._id, // Shree Radhe Polishing
    processType: "Polishing",
    items: [
      {
        orderItemId: p3._id,
        sentWeightMg: 22100,
        returnedWeightMg: null,
        lossMg: null,
        status: "SENT",
        returnPhotos: [],
        returnRemarks: "",
      },
    ],
    dispatchDate: new Date(Date.now() - 3 * 86400000),
    expectedReturnDate: new Date(Date.now() + 2 * 86400000),
    statusId: statuses[10]._id, // Dispatched
    dispatchPhotos: [{ publicId: "jw1_sent", url: JEWEL_PHOTOS.bangles, caption: "Dispatched bangles" }],
    remarks: "Deep antique matte finish with highlighted carving",
    chargesAmount: 1850,
    createdBy: staffUser._id,
  });

  console.log("11. Seeding Audit Trails (ActivityLog)...");
  await ActivityLog.insertMany([
    {
      entityType: "ORDER",
      entityId: ord1._id.toString(),
      action: "CREATED",
      remarks: "Order ORD-2026-0001 created with 3 pieces for Singhania Bridal Set",
      userId: ownerUser._id,
      userName: ownerUser.name,
      userRole: "OWNER",
      at: ord1Date,
    },
    {
      entityType: "ORDER_ITEM",
      entityId: p1._id.toString(),
      action: "ASSIGNED",
      remarks: "Issued to Karigar Suresh Mondal via Work Order WO-2026-0001",
      userId: managerUser._id,
      userName: managerUser.name,
      userRole: "MANAGER",
      at: new Date(Date.now() - 5 * 86400000),
    },
    {
      entityType: "ORDER_ITEM",
      entityId: p1._id.toString(),
      action: "PROGRESS_SUBMITTED",
      remarks: "Submitted progress by Suresh Mondal with weight 74.980g",
      userId: artisans[1].userId,
      userName: artisans[1].name,
      userRole: "KARIGAR",
      at: new Date(Date.now() - 1 * 86400000),
    },
    {
      entityType: "ORDER_ITEM",
      entityId: p3._id.toString(),
      action: "JOB_WORK_DISPATCHED",
      remarks: "Dispatched to Shree Radhe Polishing Works via Challan JW-2026-0001 (weight 22.100g)",
      userId: staffUser._id,
      userName: staffUser.name,
      userRole: "STAFF",
      at: new Date(Date.now() - 3 * 86400000),
    },
    {
      entityType: "ORDER_ITEM",
      entityId: p6._id.toString(),
      action: "DELIVERED",
      remarks: "Delivered to Mr. Vikramaditya Rao with certificate and certified final weight 18.450g",
      userId: managerUser._id,
      userName: managerUser.name,
      userRole: "MANAGER",
      at: ord4Del,
    },
  ]);

  console.log("==================================================");
  console.log("🎉 SEEDING COMPLETED SUCCESSFULLY!");
  console.log("--------------------------------------------------");
  console.log("Owner Login:    owner@bms.local    / Owner@123");
  console.log("Manager Login:  manager@bms.local  / Manager@123");
  console.log("Staff Login:    staff@bms.local    / Staff@123");
  console.log("Karigar 1:      9820044441         / PIN 1234 (Ramesh Verma)");
  console.log("Karigar 2:      9820044442         / PIN 1234 (Suresh Mondal)");
  console.log("Karigar 3:      9820044443         / PIN 1234 (Anil Patra)");
  console.log("--------------------------------------------------");
  console.log(`Database:       ${MONGODB_URI}`);
  console.log("==================================================");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seeding failed with error:", err);
  process.exit(1);
});
