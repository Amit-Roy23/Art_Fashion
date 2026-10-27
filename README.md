# BMS — Jewellery Order & Production Manager

A production-grade, cloud-hosted, mobile-responsive web application designed specifically for jewellery manufacturing businesses. It manages customer orders, assigns individual pieces to artisans (karigars), tracks multistage workshop production, external job work (polishing, plating, finishing), and customer deliveries — with **photo proofs and high-precision integer milligram weight tracking at every step**.

---

## 1. System Architecture & Tech Stack

| Layer | Technology | Rationale & Specifications |
|---|---|---|
| **Framework** | **Next.js (App Router, TS Strict)** | Unified full-stack app with React 19 Server Components, Server Actions for mutations, and route handlers for PDFs. |
| **Database** | **MongoDB Atlas** via **Mongoose** | Typed models, compound indexes, atomic counters for yearly sequential running numbering, cached serverless connection singleton. |
| **Authentication & RBAC** | **Auth.js (NextAuth v5)** | Credentials provider for Staff (email/phone + bcrypt password) and Karigars (phone + 4–6 digit PIN with 5-attempt lockout). Database-backed editable permission matrix. |
| **Design & UI** | **Tailwind CSS + shadcn/ui** | Gold-accented theme, mobile-first responsive layout (collapsible sidebar, bottom navigation for mobile, large touch targets for artisans). |
| **Forms & Validation** | **React Hook Form + Zod** | Universal schemas shared seamlessly between client components and Server Actions. |
| **High-Precision Weights** | **Integer Milligrams (`Number`)** | All weights are stored strictly as integer milligrams (`1 g = 1000 mg`) to eliminate floating-point rounding errors. Converted to 3 decimal places (`0.000 g`) on display with automatic loss and tolerance calculations. |
| **Media & Photos** | **Cloudinary** | Client-side compression with `browser-image-compression` (max ~1600px, ~300KB) and direct signed browser uploads via `/api/upload/sign`. Only metadata (`publicId`, `url`, `caption`, `uploadedBy`, `uploadedAt`) stored in MongoDB. |
| **PDF Documents** | **@react-pdf/renderer** | Server-side vector generation for Work Order PDFs, Outside Job Work Challans, and Customer Delivery Notes, with 1-click direct WhatsApp sharing. |
| **Analytics & Charts** | **Recharts** | Interactive monthly throughput (Orders Received vs Delivered) and Production Stage Workload distribution. |
| **Date & Time Localization** | **date-fns & date-fns-tz** | Strictly localized to **Asia/Kolkata (IST)** formatted as `dd MMM yyyy`. |

---

## 2. Directory Structure

```
/src
  /app
    /(auth)/login              # Dual-tab login (Staff email/phone + Karigar phone & PIN)
    /(app)                     # Authenticated staff dashboard layout
      /dashboard               # Real-time KPIs, stage workloads, overdue alerts
      /customers               # Customer CRM, life-cycle stats, order history
      /orders                  # Orders table, 3-step creation wizard (PROJECT / PIECE)
      /orders/[id]             # Order overview, pieces grid, delivery progress
      /pieces/[id]             # Piece specifications, photo gallery, weight journey, timeline
      /artisans                # Karigar registry, pending submissions, active workloads
      /assignments             # Work Orders issued to karigars
      /job-work                # Outside process challans (polishing, plating, engraving)
      /deliveries              # Customer delivery register, handover notes, partial delivery
      /reports                 # 5 registers (Orders, Karigars, Losses, Deliveries, Variances) + CSV
      /settings                # Stages pipeline, custom statuses, masters, users, RBAC matrix
    /(karigar)                 # Mobile-first artisan portal
      /k/home                  # Assigned pieces cards, due dates, camera submission button
      /k/work/[id]             # Piece specs, WO PDF download, progress submission with camera photo
    /api
      /auth/[...nextauth]      # NextAuth v5 authentication handlers
      /upload/sign             # Cloudinary signature generation endpoint
      /pdf/work-order/[id]     # Dynamic Work Order PDF download
      /pdf/job-work/[id]       # Dynamic Outside Job Work Challan PDF download
      /pdf/delivery/[id]       # Dynamic Customer Delivery Note PDF download
      /search                  # Global cross-entity search endpoint
  /components                  # Atomic UI primitives, tables, photo uploaders, timeline
  /lib                         # Cached DB connection, RBAC matrix, weight math, atomic numbering
  /models                      # 15 Mongoose schemas with compound indexes
  /schemas                     # Zod validation schemas shared across client & server
  /actions                     # Server actions with Zod parsing, RBAC validation, and audit logging
  /pdf                         # React-PDF templates (A4 printable documents)
/scripts
  /seed.ts                     # Comprehensive database seeder with realistic test data
```

---

## 3. Environment Variables Setup

Create a `.env.local` file in the project root:

```env
# MongoDB Atlas Database URI (M0 / M10 or local replica set)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/bms_jewellery?retryWrites=true&w=majority

# NextAuth / Auth.js (Generate using: openssl rand -base64 32)
AUTH_SECRET=bms_super_secret_production_ready_jwt_key_32_chars!
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cloudinary (Direct unsigned/signed uploads with client compression)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Node Environment
NODE_ENV=development
```

A template is also provided in `.env.example`.

---

## 4. Local Installation & Development

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Seed Database
Run the seed script to populate realistic Indian jewellery manufacturing data (Owner, Manager, Staff, 3 Karigars with PINs, 8 Customers, 10 Orders with ~25 Pieces, Work Orders, Job Work Challans, and Handover Deliveries):

```bash
pnpm seed
```

### 3. Start Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Pre-Configured Demo Accounts

| Role | Username / Phone | Password / PIN | Access / Permissions |
|---|---|---|---|
| **OWNER (Super Admin)** | `owner@bms.local` or `9820011111` | `Owner@123` | Full administrative control, user management, and RBAC matrix editing |
| **MANAGER (Production Lead)** | `manager@bms.local` or `9820022222` | `Manager@123` | Order review, artisan assignment, job work dispatch, submission verification |
| **STAFF (Floor Operator)** | `staff@bms.local` or `9820033333` | `Staff@123` | Order creation, photo uploads, handovers, delivery notes |
| **KARIGAR 1 (Gopal Das)** | `9830011111` | PIN: `1234` | Mobile-first portal (`/k`), view assigned work, camera progress submission |
| **KARIGAR 2 (Suresh Mondal)**| `9830022222` | PIN: `1234` | Mobile-first portal (`/k`), stone setting pieces |
| **KARIGAR 3 (Babulal Soni)** | `9830033333` | PIN: `1234` | Mobile-first portal (`/k`), diamond filing pieces |

---

## 6. Business Workflow & Invariants

1. **Order Types:**
   - **PROJECT Order:** 1 customer project containing **multiple pieces** (e.g. Bridal Set: necklace, earrings, bangles).
   - **PIECE Order:** A single standalone jewellery item.
   - Internally, both store items as `OrderItem` documents, ensuring that production tracking always operates at the piece level.
2. **Weight Precision & Tolerance:**
   - Estimated Weight (order) → Issued Weight (to karigar) → Submitted Weight (from karigar) → Sent Weight (job work) → Returned Weight (job work) → Final Weight (handover).
   - At every hand-off, the system calculates metal loss/gain (`diffMg`). If the difference exceeds the configurable threshold (`Settings → Weight Tolerance %`, default `0.5%`), an alert badge appears and the transaction is logged to the **Weight Variance Audit Report**.
3. **Mandatory Audit Records & Remarks:**
   - Every status change, assignment, submission approval, job-work handoff, and delivery mandates remarks (min 3 characters).
   - Every piece has a visual chronological **Activity Timeline** combining before/after changes, user names, timestamps in IST, photos, and weights.
4. **Artisan Mobile Portal (`/k`):**
   - Karigars log in using **Phone + PIN** on mobile devices.
   - Karigars **never** see customer contact numbers, retail prices, or other artisans' assignments.
   - Direct camera photo capture via `<input capture="environment">` with automatic client-side compression before direct Cloudinary upload.
5. **PDF & WhatsApp Sharing:**
   - Work Order PDFs, Job Work Challans, and Delivery Notes can be downloaded or directly shared via WhatsApp (`https://wa.me/<phone>?text=...`).

---

## 7. Deployment Guide

### Deploying to MongoDB Atlas
1. Create a free **M0 Sandbox** or **M10 Production** cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere) or Vercel's IP range.
3. Under **Database Access**, create a user with `readWriteAnyDatabase` permissions.
4. Copy your connection string: `mongodb+srv://<user>:<password>@cluster0.mongodb.net/bms_jewellery?retryWrites=true&w=majority`.

### Deploying to Vercel
1. Push this repository to GitHub or GitLab.
2. Import the project into [Vercel](https://vercel.com/new).
3. Set the Framework Preset to **Next.js**.
4. In **Environment Variables**, add:
   - `MONGODB_URI`
   - `AUTH_SECRET`
   - `NEXTAUTH_URL` (Set to your production Vercel URL, e.g. `https://bms-jewellery.vercel.app`)
   - `NEXT_PUBLIC_APP_URL` (Same as NEXTAUTH_URL)
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `NEXT_PUBLIC_CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
5. Click **Deploy**.
6. Once deployed, run `pnpm seed` locally with the production `MONGODB_URI` or via a one-time migration task.

---

## 8. Client Confirmation Checkpoints

The codebase is built with full flexibility. The following items are configurable directly from the **Settings** screen:
- **Custom Stages:** Add, rename, or reorder production pipeline stages (`Settings → Production Stages`).
- **Status Options:** Create custom statuses per scope (`ORDER`, `PIECE`, `ASSIGNMENT`, `JOBWORK`) mapped to reporting system categories (`Settings → Status Options`).
- **RBAC Matrix:** Edit granular permissions for Managers, Staff, and Karigars (`Settings → Role Permissions`).
- **Masters:** Add new jewellery categories, gold purities, and outside process types (`Settings → Masters`).
