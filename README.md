# Aurum BMS — Jewellery Manufacturing Suite (demo)

A cloud-hosted, mobile-responsive **Business Management Software** for a jewellery manufacturing business:
order booking, karigar (artisan) work orders, configurable production stages, outside job work, a weight ledger
accurate to the milligram, photographs at every step, and customer deliveries.

Frontend **and** backend live in this one folder (Next.js App Router + API routes) and deploy to Vercel as-is.
No database, email, password or third-party account is needed for the demo.

---

## Deploy to Vercel (one folder, zero config)

1. Push this repository to GitHub.
2. In Vercel → **Add New → Project** → import the repo.
3. Leave every setting at its default (framework is detected as Next.js; `vercel.json` pins the pnpm version) and press **Deploy**.

That's it — no environment variables are required.

Run locally:

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build && pnpm start   # production mode
```

## Quick demo login

The start page has one-tap role cards — no email, password or verification:

| Role | Who | Sees |
|---|---|---|
| Owner | Sohel Layek | Everything, incl. Reports & Settings |
| Production Manager | Rakesh Pal | Orders, karigar assignment & review, job work, deliveries, reports |
| Front desk & dispatch | Priya Das | Orders, customers, photos, job work, deliveries |
| Karigar (×5) | Gopal Das, Suresh Mondal, Babulal Soni, Anwar Sheikh, Bikash Karmakar | Mobile portal with **only their own** work orders — no customer contacts or prices |

Switch roles anytime from the user card (bottom-left of the sidebar) or the **More** menu on mobile.

## How the demo stores data

* `GET /api/seed` (backend) generates realistic sample data — 12 orders, 9 customers, 5 karigars, ~40 work orders,
  job work, deliveries, photos and a full audit trail — by replaying real business operations over the last weeks,
  so dates are always fresh.
* Every change is saved in the visitor's own browser (IndexedDB). Each person who opens the link gets a private sandbox,
  open tabs stay in sync, and **Settings → Company & demo → Reset demo data** restores the original data.
* `POST /api/pdf` (backend) renders work orders, job-work challans and delivery notes as real PDFs with photos.

## Client requirements → where they are

| Requirement (from the quotation) | In the app |
|---|---|
| **Photos attached everywhere** | Customer reference & design photos on orders/pieces, karigar progress & submission photos, job-work photos, final QC photo, delivery photo. Camera capture on phones, upload, or demo sample photos. **Photo vault** shows all of them. |
| **A. Order management** — centralised customers & orders, project-wise and piece-wise orders, specs, photos, weights, **mandatory remarks**, status from receipt to delivery | *Orders* (4-step wizard: customer → details → pieces → review), *Order detail* with lifecycle dates & progress, *Customers*. Remarks are enforced on every update. |
| **B. Karigar assignment & production** — assign orders/pieces, **work-order PDF**, artisan-wise allocation, custom status options, customisable stages, artisan photo submissions, submission dates & weights | *Assign to karigar* issues a work order with weighed metal → PDF download / WhatsApp share. *Karigars* and *Work orders* pages, karigar mobile portal (progress + submit with photo & weight), *Review submission* (approve / rework), *Production board* (drag & drop between stages). |
| **C. Outside job work & finishing** — polishing, finishing, plating etc., dispatch dates, status, weights, completion | *Outside job work*: send with challan PDF, vendor, process, expected date, custom status (e.g. Delayed), receive back with weight, charges & photos. |
| **D. Delivery & order history** — customer-wise records, receipt / processing / delivery dates, photos & weights throughout | *Deliveries* (full or partial), delivery note PDF, customer page with order & delivery history, per-piece **weight journey** and timeline. |
| **E. Centralised dashboard** — total / pending / completed / in-production orders, artisan-wise progress, pending job work & delivery, photos | *Dashboard*: KPIs, production river, items needing attention, karigar bench, job-work & ready lists, throughput chart, latest photos, activity. |
| **F. Web app** — professional, cloud-hosted, mobile-responsive | Responsive layout with a mobile dock, light (Ivory) & dark (Noir) themes, Ctrl/⌘ K search. |
| Workflow, stages, access & reports to be confirmed before development | *Settings*: production stages (rename, colour, reorder, add), status options for orders / work orders / job work, categories, purities, processes, vendors, weight tolerance, company details on PDFs, and a role-permission matrix. *Reports*: orders, pieces, karigar performance, weight variance, job work, deliveries — CSV export. |

## Weight logic

All weights are stored as integer **milligrams** and shown as grams to 3 decimals. Every hand-off
(issue → submit, sent → returned) shows the difference; anything above the tolerance (Settings, default 0.8 %) is
flagged red and listed in the weight-variance report.

## Project structure

```
src/
  app/
    page.tsx              quick-login landing
    (app)/…               staff app: dashboard, board, orders, pieces, customers, karigars,
                          work-orders, job-work, deliveries, photos, reports, settings
    k/…                   karigar mobile portal
    api/seed              demo data generator (backend)
    api/pdf               PDF renderer (backend, @react-pdf/renderer)
    api/health            health check
  lib/
    types.ts              domain model
    ops.ts                business rules (shared by backend seed & browser)
    seed.ts               sample business history
    store.ts              browser store (IndexedDB) + role permissions
    queries.ts            derived data (weight journey, loads, progress)
  components/             UI kit, dialogs for every workflow step, photo capture & lightbox
scripts/generate-demo-images.mjs   renders the bundled sample jewellery photos (public/demo)
```

## Going to production later

The business rules in `src/lib/ops.ts` are storage-agnostic. For the real system, the same operations can run inside
API routes against a hosted database (e.g. Postgres / MongoDB) with real authentication and cloud photo storage,
without changing the UI.
