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

  // 5. Customer: Mr. Fayaz
  const customer = await prisma.customer.upsert({
    where: { id: "customer-fayaz" },
    update: {
      name: "Mr. Fayaz",
      address: "Flat 27",
      building: "Main Building",
      flat: "27",
      state: "Karnataka",
    },
    create: {
      id: "customer-fayaz",
      name: "Mr. Fayaz",
      address: "Flat 27",
      building: "Main Building",
      flat: "27",
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
  console.log(`Seeded 7 master sheet rows for Mr. Fayaz flat 27`);
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
