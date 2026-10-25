# Phase 1 Assumptions & Implementation Decisions

This document outlines the key assumptions and design decisions made for Phase 1 of `gce-quote-manager`.

---

## 1. Calculation Engine (`src/lib/calc`)

### Rounding & Step Math
- **Formula**: `roundUp(frameMm) = ceil(frameMm / roundStep) * roundStep` where `roundStep = 76.2 mm` by default.
- **Conversion to Feet**: 1 foot = `304.8 mm`. Sqft is calculated as:
  $$\text{sqft} = \frac{\text{roundedHeight}}{304.8} \times \frac{\text{roundedWidth}}{304.8} \times \text{quantity}$$
- **Running Feet**:
  $$\text{runningFeet} = \left(\frac{\text{roundedHeight}}{304.8} + \frac{\text{roundedWidth}}{304.8}\right) \times 2 \times \text{quantity}$$
- **Glass Cut**:
  $$\text{glassCutHeight} = \text{frameHeight} - \text{glassDeduction}$$
  $$\text{glassCutWidth} = \text{frameWidth} - \text{glassDeduction}$$
  Default `glassDeduction = 7 mm`.

### Money & Net Amounts
- Pure TypeScript implementation with `Decimal.js` for all arithmetic. No floating-point inaccuracies.
- **Line Gross**: $\text{sqft} \times \text{rate}$.
- **Line Net**: Line gross minus optional line discount (either percent or flat), rounded to 2 decimal places using `Decimal.ROUND_HALF_UP`. For lines with 0 discount, $\text{netAmount} = \text{roundHalfUp}(\text{sqft} \times \text{rate}, 2)$.
  - Test verified: $9.375 \times 565 = 5296.875 \rightarrow 5296.88$.

### GST Calculation & State Splitting
- Default GST rate is 18%.
- **State Check**: Case-insensitive comparison against `homeState` (default `"Karnataka"`).
- **Intra-state (Karnataka)**: Split into CGST (9%) and SGST (9%).
  - Total line GST is computed as $\text{roundHalfUp}(\text{taxableAmount} \times 18\%, 2)$.
  - CGST is computed as $\text{roundHalfUp}(\text{lineGST} / 2, 2)$ and SGST as $\text{lineGST} - \text{CGST}$.
  - This ensures that $\text{CGST} + \text{SGST} = \text{GST}$ down to the exact paisa (preventing 1-paisa drift on odd amounts, e.g. Line 6 with ₹382.73 GST splits cleanly into ₹191.36 CGST and ₹191.37 SGST, preserving total GST = ₹3,866.53).
- **Inter-state (Non-Karnataka)**: 18% IGST.

### Quote-Level Discount & Totals
- **Quote Discount**: Optional discount (percent or flat) applied before GST.
  - When quote discount is present, it is distributed proportionally across line items based on line net amount, reducing line taxable amount before GST computation.
  - When quote discount is 0, each line's taxable amount equals its net amount.
- **Totals**:
  $$\text{subTotal} = \sum(\text{line net}) - \text{quoteDiscount} + \text{freight}$$
  $$\text{gstTotal} = \sum(\text{line gst})$$
  $$\text{grandTotal} = \text{subTotal} + \text{gstTotal}$$
  $$\text{displayTotal} = \text{round}(\text{grandTotal})$$
  $$\text{roundOff} = \text{displayTotal} - \text{grandTotal}$$

### Number to Words & Currency Formatting
- **Indian Number System**: `formatIndianCurrency` applies Indian digit grouping (last 3 digits, then pairs of 2) with the ₹ symbol (e.g. `₹1,00,000`, `₹25,347`, `₹21,480.63`).
- **Number to Indian Words**: `numberToIndianWords(25347)` outputs `"Indian Rupee Twenty Five Thousand Three Hundred And Forty Seven Only"`. Supports numbers up to Crores with standard title casing and "And" conjunctions. Fractional amounts are formatted with paise (e.g. "And Sixteen Paise").

---

## 2. Database Schema & Prisma

- **Provider**: SQLite with `dev.db`.
- **Prisma Version**: Prisma 6.19.3.
- **Data Types**: All financial values, rates, dimensions, and computed totals are stored as `Decimal`, mapped cleanly to SQLite without IEEE 754 float drift.
- **Enums**:
  - `Role`: `ADMIN`, `MANAGER`, `STAFF`, `VIEWER`
  - `QuoteStatus`: `DRAFT`, `SENT`, `APPROVED`, `REJECTED`, `CANCELLED`
  - `DiscountType`: `PERCENT`, `FLAT`, `NONE`
- **Soft Deletes**: Nullable `deletedAt: DateTime?` added on all domain models (`User`, `Customer`, `Product`, `Factory`, `Quote`, `QuoteItem`, `Setting`).
- **Audit Trails**: `createdById` and `updatedById` tracked on models, alongside a dedicated `AuditLog` table.
- **Indexes**: Added on queryable fields including `quoteNumber`, `status`, `customerId`, `factoryId`, `name`, `phone`, `deletedAt`, and `createdAt`.

---

## 3. Seed Data

- **Admin User**: `admin@gce.local` (password `Admin@123` hashed with bcrypt).
- **Factories**: `Veera Glass`, `Wender Sachin`.
- **Products**:
  - `Al Shutters 565` (rate: ₹565/sqft, HSN: 7610, GST: 18%)
  - `Al Shutters 430` (rate: ₹430/sqft, HSN: 7610, GST: 18%)
  - `8mm plain glass` (rate: ₹135/sqft, HSN: 7005, GST: 18%)
  - `5mm mirror polished` (rate: ₹145/sqft, HSN: 7009, GST: 18%)
- **Sample Quote**: Customer "Mr. Fayaz, flat 27", quote `Q-2026-0001` with the 7 specified line items, perfectly matching:
  - Sub Total: ₹21,480.63
  - GST Total: ₹3,866.53
  - Grand Total: ₹25,347.16
  - Round Off: -₹0.16
  - Display Total: ₹25,347



---

## 4. Phase 2 & 3: Master Sheet, Quotes Registry & Revisions

- **MasterRow Table**: Stores all Excel-like grid rows independently with per-row client metadata, auto-saved to SQLite with debounce.
- **Auto-Grouping**: Groups master rows by `Client + Flat + Building` into cohesive quotations with stable `QT-DDMMYY-NN` numbering.
- **Revisions System**:
  - Revisions are created when editing any quote in `SENT`, `APPROVED`, `IN_PRODUCTION`, or `DELIVERED` status.
  - New revision increments the version counter (`v1 -> v2 -> v3`) and sets `parentQuoteId`.
  - Revisions diff calculator evaluates before/after row diffs, rate/quantity changes, and financial difference.
- **A4 PDF Generation (`@react-pdf/renderer`)**:
  - Embedded company letterhead with Nagwara/Manyata contact info.
  - State Bank of India Richards Town bank details and live UPI QR code with prefilled amount.
  - Customer copy toggle hides cutting sizes ($H-7, W-7$) when sending client quotations.

---

## 5. Phase 4: Factory Sheet & Guillotine Cutting Optimizer

- **Guillotine Bin Packing**:
  - Uses 2D guillotine cutting heuristic (straight-line cuts from edge to opposite edge).
  - Shorter-axis split logic produces optimal packing density on standard float sheets (default: 2440 $\times$ 1830 mm).
  - Supports piece rotation (90°) and blade kerf configuration.
  - SVG layout generator produces interactive diagrams with piece tags and rotation indicators.
- **Factory Cutting Indent**:
  - Groups items by processing unit (factory), then by glass thickness/type.
  - Formats plain-text lists for WhatsApp sharing.

---

## 6. Phase 5: Payments, Milestones, Dashboard & Quality

- **70/20/10 Payment Milestones**:
  - Advance payment (70% on order).
  - Interim payment (20% on delivery).
  - Final payment (10% on completion).
  - Overdue tracking highlights quotes in progress with remaining balance.
  - Generates official payment receipts (`REC-DDMMYY-NN`) in PDF with words representation.
- **Executive Dashboard**:
  - Built with Recharts (Monthly Quoted vs Approved value, Status Funnel, Top 5 Clients, Top Products).
- **System Backups**:
  - `npm run backup` creates instant byte-for-byte SQLite snapshots in `./backups/`.
  - JSON backup/restore provides portable multi-table snapshots.

---

## 7. Multi-Customer Google Sheet Automation (`GCE Meas_42` / `_Notebook Size's @26L`)

- **Full Ingestion of 22-Column Structure**:
  - Automatically identifies whether pasted or uploaded data follows the standard 12-column layout or the full 22-column Google Sheet structure (`Date`, `Flat No`, `Client Name`, `Apartment/Building`, `Product Category`, `Item Name`, `Frame H`, `Frame W`, `Round H`, `Round W`, `Qty`, `R.ft`, `Size Sqft`, `Rate`, `State`, `GST%`, `GST Amt`, `Net Amount`, `Factory Belongs`, `Status/Installation`, `Glass H -7mm`, `Glass W -7mm`).
  - Auto-normalizes catalog items (`Al. Shutter's`, `8mm plain Glass`, `Mirror polished 5mm flat glass`) and matches predefined unit rates.
- **Autonomous Multi-Customer Separation**:
  - 100s or 1,000s of measurement rows for dozens of distinct customers are automatically isolated and partitioned by composite key `(Client + Flat + Building)`.
  - Individual customer filter dropdown on Master Sheet renders an authentic Google Sheet top banner with live totals and single-click quote generation.
- **Batch Quotation Generation**:
  - `⚡ Batch Generate All Quotes` creates numbered official quotations (`QT-DDMMYY-NN`) for every distinct customer found in the spreadsheet in a single automated step.
  - Generates ready-to-print A4 PDF quotations and pre-filled WhatsApp dispatch links.
