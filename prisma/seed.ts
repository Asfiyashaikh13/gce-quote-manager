import { PrismaClient, Role, QuoteStatus, DiscountType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { calculateQuote } from "../src/lib/calc";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Create or update Admin User
  const passwordHash = await bcrypt.hash("Admin@123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@gce.local" },
    update: {
      passwordHash,
      role: Role.ADMIN,
      name: "Admin User",
      mustChangePassword: true, // Step 1 requirement: force password change on first login
    },
    create: {
      email: "admin@gce.local",
      name: "Admin User",
      passwordHash,
      role: Role.ADMIN,
      mustChangePassword: true,
    },
  });
  console.log(`Seeded admin user: ${admin.email}`);

  // 2. Default Settings (including Step 2 & 3 settings)
  const settings = [
    { key: "roundStep", value: "76.2", description: "Default rounding step in mm" },
    { key: "glassDeduction", value: "7", description: "Default glass cut deduction in mm" },
    { key: "gstRate", value: "18", description: "Default GST percentage rate" },
    { key: "homeState", value: "Karnataka", description: "Home state for intra-state tax calculation" },
    { key: "validityDays", value: "57", description: "Default quote validity in days" },
    { key: "companyName", value: "GLASS CARE ENTERPRISES", description: "Company Name" },
    { key: "companyAddress", value: "Near Nagwara, Manyata Tech Park", description: "Company Address" },
    { key: "companyPhone", value: "7411415842", description: "Contact Phone" },
    { key: "bankName", value: "State Bank of India", description: "Bank Name" },
    { key: "bankBranch", value: "Masque Road, Richards Town, Bangalore 560005", description: "Bank Branch" },
    { key: "bankAccount", value: "42443380892", description: "Account Number" },
    { key: "bankIfsc", value: "SBIN0002263", description: "IFSC Code" },
    { key: "bankUpi", value: "9945988552@upi", description: "UPI ID" },
    {
      key: "terms",
      value: `1] Order once confirmed\n2] Any complaint related to processing quality should be informed at time of unloading duly remarked on DC\n3] All disputes shall be subject to Bangalore jurisdiction only\n4] Initial payment 70% of gross price to be paid at the time of ordering\n5] Interim payment 20% of gross price on delivery pallet glass & material of the goods to be used for the work\n6] Final payment 10% of gross price on completion of works.`,
      description: "Default Terms and Conditions",
    },
    {
      key: "stockSheetSizes",
      value: JSON.stringify([{ width: 2440, height: 1830, label: "Standard Float (2440x1830)" }]),
      description: "Available stock sheet dimensions in mm for cutting optimizer",
    },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: s,
    });
  }
  console.log("Seeded default settings");

  // 3. Create Factories
  const factoryVeera = await prisma.factory.upsert({
    where: { id: "factory-veera-glass" },
    update: { name: "Veera Glass" },
    create: {
      id: "factory-veera-glass",
      name: "Veera Glass",
      code: "VG",
      createdById: admin.id,
    },
  });

  const factoryWender = await prisma.factory.upsert({
    where: { id: "factory-wender-sachin" },
    update: { name: "Wender Sachin" },
    create: {
      id: "factory-wender-sachin",
      name: "Wender Sachin",
      code: "WS",
      createdById: admin.id,
    },
  });
  console.log(`Seeded factories: ${factoryVeera.name}, ${factoryWender.name}`);

  // 4. Create Products
  const productsData = [
    {
      code: "AL-SHUTTER-565",
      name: "Al Shutters 565",
      description: "Aluminum Shutters at ₹565/sqft",
      rate: 565,
      hsn: "7610",
      gstRate: 18,
      unit: "SQFT",
    },
    {
      code: "AL-SHUTTER-430",
      name: "Al Shutters 430",
      description: "Aluminum Shutters at ₹430/sqft",
      rate: 430,
      hsn: "7610",
      gstRate: 18,
      unit: "SQFT",
    },
    {
      code: "GLASS-PLAIN-8MM",
      name: "8mm plain glass",
      description: "8mm Plain Annealed/Float Glass at ₹135/sqft",
      rate: 135,
      hsn: "7005",
      gstRate: 18,
      unit: "SQFT",
    },
    {
      code: "MIRROR-POLISHED-5MM",
      name: "5mm mirror polished",
      description: "5mm Polished Edge Mirror at ₹145/sqft",
      rate: 145,
      hsn: "7009",
      gstRate: 18,
      unit: "SQFT",
    },
  ];

  const products: Record<string, { id: string; name: string; rate: number }> = {};
  for (const p of productsData) {
    const prod = await prisma.product.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        description: p.description,
        rate: p.rate,
        hsn: p.hsn,
        gstRate: p.gstRate,
      },
      create: {
        ...p,
        createdById: admin.id,
      },
    });
    products[p.code] = { id: prod.id, name: prod.name, rate: p.rate };
  }
  console.log("Seeded products with default rates");

  // 5. Customer: Mr. Fayaz & Customer: Ravi Sir (Sample Entry)
  const customer = await prisma.customer.upsert({
    where: { id: "customer-fayaz" },
    update: {
      name: "Mr. Fayaz",
      phone: "9945988552",
      address: "Flat 27",
      building: "Main Building",
      flat: "27",
      state: "Karnataka",
    },
    create: {
      id: "customer-fayaz",
      name: "Mr. Fayaz",
      phone: "9945988552",
      address: "Flat 27",
      building: "Main Building",
      flat: "27",
      state: "Karnataka",
      createdById: admin.id,
    },
  });

  const customerRavi = await prisma.customer.upsert({
    where: { id: "customer-ravi-sir" },
    update: {
      name: "Ravi Sir",
      phone: "8105246582",
      address: "Villa 12, Bhartiya City",
      building: "Bhartiya City",
      flat: "12",
      state: "Karnataka",
    },
    create: {
      id: "customer-ravi-sir",
      name: "Ravi Sir",
      phone: "8105246582",
      address: "Villa 12, Bhartiya City",
      building: "Bhartiya City",
      flat: "12",
      state: "Karnataka",
      createdById: admin.id,
    },
  });

  // 6. Sample Quote for Mr. Fayaz, flat 27 with 7 lines
  const rawLines = [
    { frameHeight: 1850, frameWidth: 415, quantity: 1, rate: 565, productCode: "AL-SHUTTER-565" },
    { frameHeight: 290, frameWidth: 495, quantity: 1, rate: 565, productCode: "AL-SHUTTER-565" },
    { frameHeight: 295, frameWidth: 420, quantity: 2, rate: 430, productCode: "AL-SHUTTER-430" },
    { frameHeight: 295, frameWidth: 585, quantity: 2, rate: 430, productCode: "AL-SHUTTER-430" },
    { frameHeight: 1300, frameWidth: 473, quantity: 2, rate: 565, productCode: "AL-SHUTTER-565" },
    { frameHeight: 913, frameWidth: 530, quantity: 3, rate: 135, productCode: "GLASS-PLAIN-8MM" },
    { frameHeight: 550, frameWidth: 550, quantity: 2, rate: 145, productCode: "MIRROR-POLISHED-5MM" },
  ];

  // Calculate using engine
  const calculation = calculateQuote({
    items: rawLines.map((l) => ({
      frameHeight: l.frameHeight,
      frameWidth: l.frameWidth,
      quantity: l.quantity,
      rate: l.rate,
    })),
    state: "Karnataka",
  });

  const quoteNumber = "QT-241026-01"; // Step 2 standard format QT-DDMMYY-NN

  // Clean existing quote if any for idempotent seed
  const existingQuote = await prisma.quote.findFirst({
    where: { customerName: "Mr. Fayaz, flat 27" },
  });

  if (existingQuote) {
    await prisma.quote.delete({
      where: { id: existingQuote.id },
    });
  }

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 57);

  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      version: 1,
      status: QuoteStatus.DRAFT,
      customerId: customer.id,
      customerName: "Mr. Fayaz, flat 27",
      customerAddress: "Flat 27",
      customerBuilding: "Main Building",
      customerFlat: "27",
      customerState: "Karnataka",
      destinationState: "Karnataka",
      factoryId: factoryVeera.id,
      discountType: DiscountType.NONE,
      discountValue: 0,
      freight: 0,
      validUntil,
      subTotal: calculation.totals.subTotal.toNumber(),
      cgstTotal: calculation.totals.cgstTotal.toNumber(),
      sgstTotal: calculation.totals.sgstTotal.toNumber(),
      igstTotal: calculation.totals.igstTotal.toNumber(),
      gstTotal: calculation.totals.gstTotal.toNumber(),
      grandTotal: calculation.totals.grandTotal.toNumber(),
      roundOff: calculation.totals.roundOff.toNumber(),
      displayTotal: calculation.totals.displayTotal.toNumber(),
      displayTotalWords: calculation.displayTotalWords,
      createdById: admin.id,
      items: {
        create: calculation.items.map((item, index) => {
          const raw = rawLines[index];
          const product = products[raw.productCode];
          return {
            itemOrder: index + 1,
            productId: product?.id,
            description: product?.name ?? "Custom Item",
            frameHeightMm: item.frameHeight.toNumber(),
            frameWidthMm: item.frameWidth.toNumber(),
            quantity: item.quantity,
            rate: item.rate.toNumber(),
            discountType: DiscountType.NONE,
            discountValue: 0,
            roundedHeightMm: item.roundedHeight.toNumber(),
            roundedWidthMm: item.roundedWidth.toNumber(),
            glassCutHeightMm: item.glassCutHeight.toNumber(),
            glassCutWidthMm: item.glassCutWidth.toNumber(),
            sqft: item.sqft.toNumber(),
            runningFeet: item.runningFeet.toNumber(),
            grossAmount: item.grossAmount.toNumber(),
            discountAmount: item.discountAmount.toNumber(),
            netAmount: item.netAmount.toNumber(),
            taxableAmount: item.taxableAmount.toNumber(),
            cgstRate: item.cgstRate.toNumber(),
            sgstRate: item.sgstRate.toNumber(),
            igstRate: item.igstRate.toNumber(),
            cgstAmount: item.cgstAmount.toNumber(),
            sgstAmount: item.sgstAmount.toNumber(),
            igstAmount: item.igstAmount.toNumber(),
            gstAmount: item.gstAmount.toNumber(),
            totalAmount: item.totalAmount.toNumber(),
            createdById: admin.id,
          };
        }),
      },
    },
    include: {
      items: true,
    },
  });

  console.log(`Seeded sample quote ${quote.quoteNumber} for ${quote.customerName}`);
  console.log(`Totals -> SubTotal: ${quote.subTotal}, GST: ${quote.gstTotal}, GrandTotal: ${quote.grandTotal}, Display: ${quote.displayTotal}`);

  // 6b. Sample Entry: Ravi Sir (Infographic Spec: 17/10/26 | Ravi Sir | 8105246582 | Marble+Glass | 46,085 | Follow Up)
  const existingRaviQuote = await prisma.quote.findFirst({
    where: { quoteNumber: "QT-171026-01" },
  });
  if (existingRaviQuote) {
    await prisma.quote.delete({ where: { id: existingRaviQuote.id } });
  }

  const raviQuote = await prisma.quote.create({
    data: {
      quoteNumber: "QT-171026-01",
      version: 1,
      status: QuoteStatus.SENT,
      customerId: customerRavi.id,
      customerName: "Ravi Sir",
      customerPhone: "8105246582",
      customerAddress: "Villa 12, Bhartiya City",
      customerBuilding: "Bhartiya City",
      customerFlat: "12",
      customerState: "Karnataka",
      destinationState: "Karnataka",
      factoryId: factoryVeera.id,
      discountType: DiscountType.NONE,
      discountValue: 0,
      freight: 0,
      validUntil,
      subTotal: 39055.08,
      cgstTotal: 3514.96,
      sgstTotal: 3514.96,
      igstTotal: 0,
      gstTotal: 7029.92,
      grandTotal: 46085,
      roundOff: 0,
      displayTotal: 46085,
      displayTotalWords: "Forty-Six Thousand Eighty-Five Rupees Only",
      createdById: admin.id,
      revisionNotes: "Marble+Glass architectural installation - Follow Up required",
      items: {
        create: [
          {
            itemOrder: 1,
            description: "Custom Marble Inlay + 12mm Toughened Glass",
            frameHeightMm: 1200,
            frameWidthMm: 900,
            quantity: 2,
            rate: 850,
            roundedHeightMm: 1219.2,
            roundedWidthMm: 914.4,
            glassCutHeightMm: 1193,
            glassCutWidthMm: 893,
            sqft: 24.0,
            runningFeet: 28.0,
            grossAmount: 20400,
            discountAmount: 0,
            netAmount: 20400,
            taxableAmount: 20400,
            cgstRate: 9,
            sgstRate: 9,
            igstRate: 0,
            cgstAmount: 1836,
            sgstAmount: 1836,
            igstAmount: 0,
            gstAmount: 3672,
            totalAmount: 24072,
            createdById: admin.id,
          },
          {
            itemOrder: 2,
            description: "Beveled Edge Glass with Brass Trim Profiles",
            frameHeightMm: 1500,
            frameWidthMm: 600,
            quantity: 2,
            rate: 975,
            roundedHeightMm: 1524,
            roundedWidthMm: 609.6,
            glassCutHeightMm: 1493,
            glassCutWidthMm: 593,
            sqft: 20.0,
            runningFeet: 28.0,
            grossAmount: 18655.08,
            discountAmount: 0,
            netAmount: 18655.08,
            taxableAmount: 18655.08,
            cgstRate: 9,
            sgstRate: 9,
            igstRate: 0,
            cgstAmount: 1678.96,
            sgstAmount: 1678.96,
            igstAmount: 0,
            gstAmount: 3357.92,
            totalAmount: 22013,
            createdById: admin.id,
          },
        ],
      },
    },
  });
  console.log(`Seeded Ravi Sir quote QT-171026-01 (Total: ${raviQuote.displayTotal})`);

  // 7. Seed Master Sheet Rows (Phase 2 Master Sheet with per-row client metadata)
  await prisma.masterRow.deleteMany({});
  for (let i = 0; i < calculation.items.length; i++) {
    const item = calculation.items[i];
    const raw = rawLines[i];
    const product = products[raw.productCode];

    await prisma.masterRow.create({
      data: {
        rowOrder: i + 1,
        clientName: "Mr. Fayaz",
        flat: "27",
        building: "Main Building",
        state: "Karnataka",
        factory: "Veera Glass",
        status: "Draft",
        notes: `Seed line ${i + 1}`,
        productId: product?.id,
        description: product?.name ?? "Custom Item",
        frameHeightMm: item.frameHeight.toNumber(),
        frameWidthMm: item.frameWidth.toNumber(),
        quantity: item.quantity,
        rate: item.rate.toNumber(),
        discountType: "NONE",
        discountValue: 0,
        roundedHeightMm: item.roundedHeight.toNumber(),
        roundedWidthMm: item.roundedWidth.toNumber(),
        glassCutHeightMm: item.glassCutHeight.toNumber(),
        glassCutWidthMm: item.glassCutWidth.toNumber(),
        sqft: item.sqft.toNumber(),
        runningFeet: item.runningFeet.toNumber(),
        netAmount: item.netAmount.toNumber(),
        gstAmount: item.gstAmount.toNumber(),
        totalAmount: item.totalAmount.toNumber(),
      },
    });
  }

  // Add Ravi Sir sample rows into Master Sheet
  const raviRows = [
    {
      rowOrder: 8,
      clientName: "Ravi Sir",
      flat: "12",
      building: "Bhartiya City",
      state: "Karnataka",
      factory: "Royal Marble Works",
      status: "Follow Up",
      notes: "Marble+Glass living room partition - 8105246582",
      description: "Custom Marble Inlay + 12mm Toughened Glass",
      frameHeightMm: 1200,
      frameWidthMm: 900,
      quantity: 2,
      rate: 850,
      roundedHeightMm: 1219.2,
      roundedWidthMm: 914.4,
      glassCutHeightMm: 1193,
      glassCutWidthMm: 893,
      sqft: 24.0,
      runningFeet: 28.0,
      netAmount: 20400,
      gstAmount: 3672,
      totalAmount: 24072,
    },
    {
      rowOrder: 9,
      clientName: "Ravi Sir",
      flat: "12",
      building: "Bhartiya City",
      state: "Karnataka",
      factory: "Veera Glass",
      status: "Follow Up",
      notes: "Beveled edge glass with brass profiles - 8105246582",
      description: "Beveled Edge Glass with Brass Trim Profiles",
      frameHeightMm: 1500,
      frameWidthMm: 600,
      quantity: 2,
      rate: 975,
      roundedHeightMm: 1524,
      roundedWidthMm: 609.6,
      glassCutHeightMm: 1493,
      glassCutWidthMm: 593,
      sqft: 20.0,
      runningFeet: 28.0,
      netAmount: 18655.08,
      gstAmount: 3357.92,
      totalAmount: 22013,
    },
  ];

  for (const r of raviRows) {
    await prisma.masterRow.create({
      data: {
        ...r,
        discountType: "NONE",
        discountValue: 0,
      },
    });
  }
  console.log(`Seeded 7 master sheet rows for Mr. Fayaz flat 27 and 2 rows for Ravi Sir`);

  // 8. Seed Vendors (Tab 4: Vendor List)
  const vendors = [
    {
      name: "Veera Glass",
      mobile: "9845012345",
      workType: "Glass Toughening & Polish",
      rate: "₹135/sqft",
      balanceDue: 14200,
      status: "PENDING",
      notes: "Main glass processor for Manyata & Hebbal sites",
    },
    {
      name: "Wender Sachin",
      mobile: "9886098765",
      workType: "Aluminium Profiles & Fabrication",
      rate: "₹430/sqft",
      balanceDue: 8500,
      status: "PENDING",
      notes: "Aluminium section supplier and cutter",
    },
    {
      name: "Royal Marble Works",
      mobile: "8105200112",
      workType: "Marble Inlay & Edge Chamfering",
      rate: "₹250/sqft",
      balanceDue: 12000,
      status: "FOLLOW_UP",
      notes: "Subcontractor for Ravi Sir marble+glass work",
    },
  ];

  for (const v of vendors) {
    await prisma.vendor.upsert({
      where: { id: `vendor-${v.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: v,
      create: {
        id: `vendor-${v.name.toLowerCase().replace(/\s+/g, "-")}` ,
        ...v,
      },
    });
  }
  console.log("Seeded Tab 4: Vendors");

  // 9. Seed Purchases & Expenses (Tab 5 with Owner vs Partner tracking & Project linkage)
  const expenses = [
    {
      item: "12mm Toughened Glass Float",
      amount: 14200,
      vendorName: "Veera Glass",
      paidBy: "OWNER",
      projectName: "Ravi Sir - Bhartiya City",
      paymentMode: "UPI",
      hasBill: true,
      category: "PURCHASE",
      status: "RECEIVED",
      notes: "Invoice #VG-942 - Paid by Owner via 9945988552@upi",
    },
    {
      item: "Hardware Screws & Silicone Sealant",
      amount: 2850,
      vendorName: "Sri Balaji Hardware",
      paidBy: "PARTNER",
      projectName: "Ravi Sir - Bhartiya City",
      paymentMode: "CASH",
      hasBill: true,
      category: "SITE_EXPENSE",
      status: "RECEIVED",
      notes: "Clear silicone tubes (qty 12) + fasteners - Paid by Partner",
    },
    {
      item: "Site Labor & Unloading Conveyance",
      amount: 1600,
      vendorName: "Local Tempo Transport",
      paidBy: "PARTNER",
      projectName: "Ravi Sir - Bhartiya City",
      paymentMode: "CASH",
      hasBill: false,
      category: "SITE_EXPENSE",
      status: "RECEIVED",
      notes: "Unloading at Ravi Sir site Bhartiya City - Paid by Partner",
    },
  ];

  for (let i = 0; i < expenses.length; i++) {
    const e = expenses[i];
    await prisma.expense.upsert({
      where: { id: `expense-seed-${i + 1}` },
      update: e,
      create: {
        id: `expense-seed-${i + 1}`,
        ...e,
      },
    });
  }
  console.log("Seeded Tab 5: Purchases & Expenses");

  // 10. Seed Monthly Profit & 30/70 Partner Split (Tab 6)
  await prisma.profitMonth.upsert({
    where: { monthYear: "10/2026" },
    update: {
      salesAmount: 118500,
      purchaseAmount: 52400,
      expenseAmount: 14250,
      profitAmount: 51850,
      partnerPercent: 30,
      partnerAmount: 15555,
      ownerAmount: 36295,
      status: "RECEIVED",
      notes: "October 2026: Profit = Sale (1,18,500) - Purchase (52,400) - Expense (14,250) = 51,850. Partner 30% = 15,555, Owner 70% = 36,295",
    },
    create: {
      id: "profit-month-10-2026",
      monthYear: "10/2026",
      salesAmount: 118500,
      purchaseAmount: 52400,
      expenseAmount: 14250,
      profitAmount: 51850,
      partnerPercent: 30,
      partnerAmount: 15555,
      ownerAmount: 36295,
      status: "RECEIVED",
      notes: "October 2026: Profit = Sale (1,18,500) - Purchase (52,400) - Expense (14,250) = 51,850. Partner 30% = 15,555, Owner 70% = 36,295",
    },
  });
  console.log("Seeded Tab 6: Monthly Profit & Partner 30/70 Split");

  // 11. Seed Inventory & Stock (Tab 7)
  const stockItems = [
    {
      itemName: "8mm Plain Glass",
      category: "GLASS",
      stockIn: 450,
      stockUsed: 280,
      stockBalance: 170,
      unit: "SQFT",
      status: "IN_STOCK",
      notes: "Standard clear float sheets",
    },
    {
      itemName: "12mm Toughened Glass",
      category: "GLASS",
      stockIn: 600,
      stockUsed: 350,
      stockBalance: 250,
      unit: "SQFT",
      status: "IN_STOCK",
      notes: "High strength architectural glass",
    },
    {
      itemName: "5mm Mirror Polished",
      category: "GLASS",
      stockIn: 300,
      stockUsed: 180,
      stockBalance: 120,
      unit: "SQFT",
      status: "IN_STOCK",
      notes: "Silver mirror with polished bevel edges",
    },
    {
      itemName: "Aluminium Shutter Profiles",
      category: "AL_PROFILE",
      stockIn: 250,
      stockUsed: 160,
      stockBalance: 90,
      unit: "RFT",
      status: "IN_STOCK",
      notes: "Anodized black & champagne finish",
    },
  ];

  for (const s of stockItems) {
    await prisma.inventoryStock.upsert({
      where: { itemName: s.itemName },
      update: s,
      create: {
        id: `stock-${s.itemName.toLowerCase().replace(/\s+/g, "-")}`,
        ...s,
      },
    });
  }
  console.log("Seeded Tab 7: Inventory & Stock");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
