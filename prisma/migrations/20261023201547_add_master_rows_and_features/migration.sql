-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "building" TEXT;
ALTER TABLE "Customer" ADD COLUMN "flat" TEXT;

-- CreateTable
CREATE TABLE "MasterRow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rowOrder" INTEGER NOT NULL DEFAULT 0,
    "clientName" TEXT NOT NULL DEFAULT '',
    "flat" TEXT DEFAULT '',
    "building" TEXT DEFAULT '',
    "state" TEXT NOT NULL DEFAULT 'Karnataka',
    "factory" TEXT DEFAULT 'Veera Glass',
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "notes" TEXT DEFAULT '',
    "productId" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "frameHeightMm" DECIMAL NOT NULL DEFAULT 0,
    "frameWidthMm" DECIMAL NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "rate" DECIMAL NOT NULL DEFAULT 0,
    "discountType" TEXT NOT NULL DEFAULT 'NONE',
    "discountValue" DECIMAL NOT NULL DEFAULT 0,
    "roundedHeightMm" DECIMAL NOT NULL DEFAULT 0,
    "roundedWidthMm" DECIMAL NOT NULL DEFAULT 0,
    "glassCutHeightMm" DECIMAL NOT NULL DEFAULT 0,
    "glassCutWidthMm" DECIMAL NOT NULL DEFAULT 0,
    "sqft" DECIMAL NOT NULL DEFAULT 0,
    "runningFeet" DECIMAL NOT NULL DEFAULT 0,
    "netAmount" DECIMAL NOT NULL DEFAULT 0,
    "gstAmount" DECIMAL NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "milestone" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'BANK',
    "reference" TEXT,
    "paymentDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "recordedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Payment_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteNumber" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "customerBuilding" TEXT,
    "customerFlat" TEXT,
    "customerState" TEXT NOT NULL DEFAULT 'Karnataka',
    "destinationState" TEXT NOT NULL DEFAULT 'Karnataka',
    "factoryId" TEXT,
    "discountType" TEXT NOT NULL DEFAULT 'NONE',
    "discountValue" DECIMAL NOT NULL DEFAULT 0,
    "freight" DECIMAL NOT NULL DEFAULT 0,
    "validUntil" DATETIME,
    "parentQuoteId" TEXT,
    "revisionNotes" TEXT,
    "subTotal" DECIMAL NOT NULL DEFAULT 0,
    "cgstTotal" DECIMAL NOT NULL DEFAULT 0,
    "sgstTotal" DECIMAL NOT NULL DEFAULT 0,
    "igstTotal" DECIMAL NOT NULL DEFAULT 0,
    "gstTotal" DECIMAL NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL NOT NULL DEFAULT 0,
    "roundOff" DECIMAL NOT NULL DEFAULT 0,
    "displayTotal" DECIMAL NOT NULL DEFAULT 0,
    "displayTotalWords" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "createdById" TEXT,
    "updatedById" TEXT,
    CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quote_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quote_parentQuoteId_fkey" FOREIGN KEY ("parentQuoteId") REFERENCES "Quote" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quote_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Quote" ("cgstTotal", "createdAt", "createdById", "customerAddress", "customerId", "customerName", "customerPhone", "customerState", "deletedAt", "destinationState", "discountType", "discountValue", "displayTotal", "displayTotalWords", "factoryId", "freight", "grandTotal", "gstTotal", "id", "igstTotal", "notes", "quoteNumber", "roundOff", "sgstTotal", "status", "subTotal", "updatedAt", "updatedById", "version") SELECT "cgstTotal", "createdAt", "createdById", "customerAddress", "customerId", "customerName", "customerPhone", "customerState", "deletedAt", "destinationState", "discountType", "discountValue", "displayTotal", "displayTotalWords", "factoryId", "freight", "grandTotal", "gstTotal", "id", "igstTotal", "notes", "quoteNumber", "roundOff", "sgstTotal", "status", "subTotal", "updatedAt", "updatedById", "version" FROM "Quote";
DROP TABLE "Quote";
ALTER TABLE "new_Quote" RENAME TO "Quote";
CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");
CREATE INDEX "Quote_quoteNumber_idx" ON "Quote"("quoteNumber");
CREATE INDEX "Quote_status_idx" ON "Quote"("status");
CREATE INDEX "Quote_customerId_idx" ON "Quote"("customerId");
CREATE INDEX "Quote_factoryId_idx" ON "Quote"("factoryId");
CREATE INDEX "Quote_parentQuoteId_idx" ON "Quote"("parentQuoteId");
CREATE INDEX "Quote_createdAt_idx" ON "Quote"("createdAt");
CREATE INDEX "Quote_deletedAt_idx" ON "Quote"("deletedAt");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "createdById" TEXT,
    "updatedById" TEXT
);
INSERT INTO "new_User" ("createdAt", "createdById", "deletedAt", "email", "id", "name", "passwordHash", "role", "updatedAt", "updatedById") SELECT "createdAt", "createdById", "deletedAt", "email", "id", "name", "passwordHash", "role", "updatedAt", "updatedById" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "MasterRow_clientName_idx" ON "MasterRow"("clientName");

-- CreateIndex
CREATE INDEX "MasterRow_building_idx" ON "MasterRow"("building");

-- CreateIndex
CREATE INDEX "MasterRow_flat_idx" ON "MasterRow"("flat");

-- CreateIndex
CREATE INDEX "MasterRow_status_idx" ON "MasterRow"("status");

-- CreateIndex
CREATE INDEX "MasterRow_rowOrder_idx" ON "MasterRow"("rowOrder");

-- CreateIndex
CREATE INDEX "MasterRow_deletedAt_idx" ON "MasterRow"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");

-- CreateIndex
CREATE INDEX "Payment_quoteId_idx" ON "Payment"("quoteId");

-- CreateIndex
CREATE INDEX "Payment_receiptNumber_idx" ON "Payment"("receiptNumber");

-- CreateIndex
CREATE INDEX "Payment_paymentDate_idx" ON "Payment"("paymentDate");

-- CreateIndex
CREATE INDEX "Payment_deletedAt_idx" ON "Payment"("deletedAt");

-- CreateIndex
CREATE INDEX "Customer_building_idx" ON "Customer"("building");

-- CreateIndex
CREATE INDEX "Customer_flat_idx" ON "Customer"("flat");
