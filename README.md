# GCE Quote Manager (Glass Care Enterprises)

A full-stack enterprise quotation management, pricing calculation engine, factory cutting optimizer, and payment tracking application built for **Glass Care Enterprises** using Next.js 16 (Turbopack, Partial Prerendering), React 19, TypeScript, Tailwind CSS v4, and Prisma 6 with SQLite.

---

## 🌟 Key Features

### 1. Excel-like Master Calculation Sheet (`/`)
- **Per-row Customer Metadata**: Client name, Flat, Building, State, Factory, Status, and Remarks per row.
- **Pure TypeScript Calculation Engine (`src/lib/calc`)**: High-precision money math using `decimal.js`.
  - **Rounding Step**: Frame mm rounded up to multiples of 76.2 mm (`ceil(dim / 76.2) * 76.2`).
  - **Glass Cut Deduction**: Glass dimensions automatically calculated as Frame $- 7\text{ mm}$.
  - **Square Footage**: $(H_{rounded} / 304.8) \times (W_{rounded} / 304.8) \times Qty$.
  - **Running Feet**: $((H_{rounded} / 304.8) + (W_{rounded} / 304.8)) \times 2 \times Qty$.
  - **Net Amount**: Line Sqft $\times$ Rate rounded to 2 decimal places half-up.
  - **Taxes**: 18% GST (CGST 9% + SGST 9% for Karnataka intra-state; IGST 18% for inter-state).
  - **Currency Formatting**: Indian number notation (`₹1,00,000.00`) and Indian words translation.
- **Product Autocomplete**: Instant rate selection for Aluminum Shutters (₹565/430), 8mm plain glass (₹135), 5mm mirror polished (₹145).
- **Spreadsheet Operations**:
  - Full TSV paste from Excel & Google Sheets (Ctrl+V).
  - Multi-level Undo & Redo (Ctrl+Z / Ctrl+Y).
  - Fill Down previous row metadata (Ctrl+D).
  - Instant search, filter by factory/status/state.
  - Background debounced autosave to SQLite with status indicator.
- **Mobile Card View**: Responsive card-per-row editor on mobile devices (<768px).

### 2. Quotations Registry & Versioned Revisions (`/quotes`)
- **Auto-Grouping**: Groups master sheet rows into cohesive quotes by Client + Flat + Building.
- **Stable Numbering**: Sequential immutable quote IDs `QT-DDMMYY-NN`.
- **Status State Machine**: Enforces strict business transitions:
  - `Draft` &rarr; `Sent` &rarr; `Approved` &rarr; `In Production` &rarr; `Delivered` &rarr; `Paid` (or `Cancelled`).
- **Versioned Revisions Diff**: Editing a quote after `Sent` automatically increments version (`v1`, `v2`, `v3`) and tracks before/after row diffs, rate changes, and price delta.
- **A4 PDF Generator (`@react-pdf/renderer`)**:
  - Matches Glass Care Enterprises letterhead, Nagwara / Manyata Tech Park address, Contact: 7411415842.
  - Bank details: State Bank of India, Richards Town, A/c 42443380892, IFSC SBIN0002263, UPI 9945988552@upi.
  - Dynamic UPI QR Code prefilled with quote amount.
  - Standard Terms & Conditions (1-6) with milestone terms.
  - Customer copy toggle to hide glass cutting sizes.
- **WhatsApp Integration**: Prefilled direct `wa.me` links with quote total and breakdown.
- **Excel Export**: Instant `.xlsx` download formatted for customer quotations.

### 3. Factory Sheet & Guillotine Cutting Optimizer (`/factory`)
- **Factory Cutting Indent**: Rows grouped by Factory (Veera Glass, Wender Sachin) and sub-grouped by Glass Type / Thickness.
- **A4 Printable View**: Dedicated print stylesheet (`@media print`) and downloadable PDF cutting indent.
- **Copy for WhatsApp**: 1-click formatted plain-text cutting indent for glass processors.
- **2D Guillotine Bin Packing Optimizer (`src/lib/optimizer/guillotine.ts`)**:
  - Guillotine-split heuristic tailored for flat sheet glass scoring.
  - Stock sheet presets: Standard Float (2440 $\times$ 1830 mm), Jumbo (3210 $\times$ 2250 mm).
  - Configurable 90° piece rotation and blade kerf.
  - Sheet count calculation, total glass area, and wastage % statistics.
  - Interactive SVG visualizer displaying exact piece placements, coordinates, dimensions, and rotation indicator.

### 4. Payments, Milestones & Receipts (`/payments`)
- **70/20/10 Milestone Schedule**:
  - 70% Initial Advance on ordering.
  - 20% Interim Payment on delivery.
  - 10% Final Payment on completion.
- **Payment Recording**: Cash, UPI, Bank Transfer (NEFT/RTGS/IMPS), Cheque.
- **Receipt Generator (`@react-pdf/renderer`)**: Official payment receipts (`REC-DDMMYY-NN`) with amount in figures and Indian words.
- **Overdue Tracking**: Highlights unpaid quotes in production/delivered with 1-click WhatsApp payment reminders with bank details.

### 5. Executive Dashboard & Analytics (`/dashboard`)
- **KPI Metrics**: Total Quotes, Quoted Value, Approved Value, Conversion Rate (%), Total Revenue Collected, Total Outstanding, and Overdue aging.
- **Recharts Data Visualizations**:
  - Monthly Quoted vs Approved value trend.
  - Quotation status funnel (Draft to Paid).
  - Top 5 Clients by quoted value.
  - Top Products by volume and revenue.
- **Date Range Filters**: All Time, This Month, Last 30 Days, This Quarter, This Year.

### 6. Customer Directory (`/customers`)
- Auto-aggregated CRM directory built from sheet rows and quotations.
- Tracks client site locations, total quoted value, total paid, and balance.

### 7. Security, Settings, Audit & Backup
- **Role-Based Access Control**:
  - `ADMIN`: Full access (users, backup, settings, deletion).
  - `MANAGER`: Quotes, factory, pricing, payments, settings.
  - `STAFF`: Master sheet editing, quote viewing.
  - `VIEWER`: Read-only access across all sections.
- **System Settings (`/settings`)**: Configures calc engine defaults, company address, bank info, quote validity, and terms.
- **Audit Trail (`/admin/audit`)**: Logs user activity, entity changes, IP addresses, and timestamps.
- **Backup & Restore (`/admin/backup`)**: Full database JSON download and upload, plus CLI backup tool.

---

## 🚀 Quickstart & Setup

### Prerequisites
- Node.js 18.18+ or 20+
- npm 9+

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Default `.env`:
```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="gce-secret-key-32-chars-minimum-token-12345"
```

### 3. Database Migration & Seed
```bash
npx prisma migrate dev
npm run prisma:seed # or npx tsx prisma/seed.ts
```

### 4. Start the Application
```bash
# Development server (Turbopack)
npm run dev

# Or Production build and start
npm run build
npm run start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Default Credentials

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@gce.local` | `Admin@123` | Full administrative control, users, settings, backup |
| **MANAGER** | `manager@gce.local` | `Manager@123` | Quotes, pricing, factory, payments, settings |
| **STAFF** | `staff@gce.local` | `Staff@123` | Master sheet editing, quote views |
| **VIEWER** | `viewer@gce.local` | `Viewer@123` | Read-only access |

*Note: The admin account has `mustChangePassword: true` enabled on seed for enterprise compliance.*

---

## 🛠️ CLI Scripts & Automation

```bash
# Run unit and integration tests (Vitest)
npm test

# Run End-to-End browser tests (Playwright)
npm run test:e2e

# Run TypeScript type check
npm run typecheck

# Run ESLint validation
npm run lint

# Create timestamped SQLite backup in ./backups/
npm run backup

# Build optimized production bundle
npm run build
```

---

## 📦 Automated Backups

To create an instant snapshot of the SQLite database:
```bash
npm run backup
```
This generates a timestamped copy in `./backups/dev_YYYYMMDD_HHMMSS.db`.

For automated nightly backups, add to crontab:
```bash
0 2 * * * cd /path/to/gce-quote-manager && npm run backup >> /var/log/gce-backup.log 2>&1
```

---

## 🧪 Verified Seed Check
Mr. Fayaz, Flat 27 (7 lines):
- **Line Items**:
  1. 1850 $\times$ 415 mm, Qty 1, Rate ₹565 &rarr; Sqft: 9.38, Net: ₹5,296.88
  2. 290 $\times$ 495 mm, Qty 1, Rate ₹565 &rarr; Sqft: 1.64, Net: ₹926.88
  3. 295 $\times$ 420 mm, Qty 2, Rate ₹430 &rarr; Sqft: 2.73, Net: ₹1,175.78
  4. 295 $\times$ 585 mm, Qty 2, Rate ₹430 &rarr; Sqft: 3.81, Net: ₹1,637.70
  5. 1300 $\times$ 473 mm, Qty 2, Rate ₹565 &rarr; Sqft: 18.02, Net: ₹10,180.38
  6. 913 $\times$ 530 mm, Qty 3, Rate ₹135 &rarr; Sqft: 10.55, Net: ₹1,423.83
  7. 550 $\times$ 550 mm, Qty 2, Rate ₹145 &rarr; Sqft: 5.79, Net: ₹839.18
- **Sub Total**: **₹21,480.63**
- **GST (18%)**: **₹3,866.53**
- **Grand Total**: **₹25,347.16**
- **Display Total**: **₹25,347** (Round-off: -₹0.16)
- **Words**: *Indian Rupee Twenty Five Thousand Three Hundred And Forty Seven Only*

---

## 📄 License
Proprietary software for **Glass Care Enterprises, Bangalore**. All rights reserved.
