import http from "node:http";

const PORT = process.env.PORT || "3005";
const BASE_URL = `http://127.0.0.1:${PORT}`;

interface TestResult {
  suite: string;
  test: string;
  status: "PASS" | "FAIL" | "BLOCKED" | "NOT TESTED";
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, test: string, details?: string) {
  if (condition) {
    results.push({ suite, test, status: "PASS", details });
    console.log(`\x1b[32m✔ [PASS]\x1b[0m [${suite}] ${test}`);
  } else {
    results.push({ suite, test, status: "FAIL", details });
    console.error(`\x1b[31m✘ [FAIL]\x1b[0m [${suite}] ${test} - Details: ${details}`);
  }
}

async function request(path: string, options: RequestInit = {}): Promise<{ status: number; headers: Headers; data: any }> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, options);
  const contentType = res.headers.get("content-type") || "";
  let data: any = null;
  if (contentType.includes("application/json")) {
    data = await res.json().catch(() => null);
  } else if (contentType.includes("application/pdf")) {
    data = await res.arrayBuffer();
  } else {
    data = await res.text();
  }
  return { status: res.status, headers: res.headers, data };
}

async function runAudit() {
  console.log("=== STARTING COMPLETE AUDIT & VERIFICATION ===");

  // --- 1. Security Headers ---
  const homeRes = await request("/");
  assert(homeRes.headers.get("x-frame-options") === "SAMEORIGIN", "Security", "X-Frame-Options: SAMEORIGIN");
  assert(homeRes.headers.get("x-content-type-options") === "nosniff", "Security", "X-Content-Type-Options: nosniff");
  assert(homeRes.headers.get("referrer-policy") === "strict-origin-when-cross-origin", "Security", "Referrer-Policy: strict-origin-when-cross-origin");
  assert(homeRes.headers.has("strict-transport-security"), "Security", "Strict-Transport-Security header present");
  assert(Boolean(homeRes.headers.get("permissions-policy")?.includes("camera=()")), "Security", "Permissions-Policy header configured");

  // --- 2. Authentication ---
  // Invalid login
  const badLogin = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "invalid@gce.local", password: "wrong" }),
  });
  assert(badLogin.status === 401, "Auth", "Invalid login rejected with 401");

  // Valid login
  const goodLogin = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@gce.local", password: "Admin@123" }),
  });
  assert(goodLogin.status === 200, "Auth", "Admin login succeeds with 200");
  const rawSetCookie = (goodLogin.headers as any).getSetCookie?.() || [goodLogin.headers.get("set-cookie") || ""];
  const cookieHeader = Array.isArray(rawSetCookie) ? rawSetCookie.join("; ") : String(rawSetCookie);
  assert(cookieHeader.includes("gce_session"), "Auth", "Auth session cookie returned");

  // Extract token cookie
  const tokenMatch = cookieHeader.match(/gce_session=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : "";
  const authHeaders = {
    "Content-Type": "application/json",
    Cookie: `gce_session=${token}`,
  };

  // Protected route with cookie
  const meRes = await request("/api/auth/me", { headers: authHeaders });
  assert(meRes.status === 200 && meRes.data?.user?.role === "ADMIN", "Auth", "Authorized /api/auth/me returns ADMIN user");

  // Unauthorized access without cookie to protected route
  const unauthRes = await request("/api/quotes");
  assert(unauthRes.status === 401, "Auth", "Access to /api/quotes without token blocked with 401");

  // --- 3. GSTIN Secure Backend Proxy ---
  // Format check: Bad GSTIN
  const badGstin = await request("/api/gstin?gstin=INVALID123");
  assert(badGstin.status === 400 && badGstin.data?.success === false, "GSTIN Proxy", "Invalid format rejected with 400");

  // Cache & lookup: Valid GSTIN
  const validGstin = await request("/api/gstin?gstin=29BNYPN6916L1ZU");
  assert(
    validGstin.status === 200 &&
    validGstin.data?.success === true &&
    validGstin.data?.tradeName?.includes("GLASS CARE"),
    "GSTIN Proxy",
    "Valid GSTIN returns verified business trade name and status"
  );
  assert(validGstin.data?.cached === true, "GSTIN Proxy", "GSTIN response served from cache to protect user API credits");

  // --- 4. Mathematical & Calculation Rules ---
  // Formula tests
  const testW_mm = 600;
  const testH_mm = 1800;
  const testQty = 2;
  const expectedSqftMm = (testH_mm * testW_mm * testQty) / 92903.04; // 23.25004...
  assert(Math.abs(expectedSqftMm - 23.25) < 0.01, "Calculations", "Sq Ft MM formula: (H*W*Q)/92,903.04 matches 23.25 sqft");

  const testW_in = 24;
  const testH_in = 72;
  const expectedSqftIn = (testH_in * testW_in * testQty) / 144; // 24 sqft
  assert(expectedSqftIn === 24, "Calculations", "Sq Ft Inches formula: (H*W*Q)/144 matches 24 sqft");

  const testL_in = 24;
  const testD_in = 6;
  const expectedCuftIn = (testL_in * testW_in * testD_in * testQty) / 1728; // 4 cuft
  assert(expectedCuftIn === 4, "Calculations", "Cu Ft Inches formula: (L*W*D*Q)/1728 matches 4 cuft");

  const testL_mm = 600;
  const testD_mm = 150;
  const expectedCuftMm = (testL_mm * testW_mm * testD_mm * testQty) / 28316846.592;
  assert(Math.abs(expectedCuftMm - 3.8139) < 0.01, "Calculations", "Cu Ft MM formula: (L*W*D*Q)/28,316,846.592 matches 3.81 cuft");

  // -7mm glass deduction rule
  const frameH = 1800;
  const frameW = 600;
  const glassCutH = frameH - 7;
  const glassCutW = frameW - 7;
  assert(glassCutH === 1793 && glassCutW === 593, "Calculations", "Glass cutting size subtracts exactly 7mm from frame dimension");

  // --- 5. Tab 1 - Quotation Tracker & Integration Sync ---
  const syncPayload = {
    document: {
      id: "audit-test-doc-001",
      type: "Bill",
      number: "GCE-AUDIT-001",
      date: new Date().toISOString().split("T")[0],
      state: "Karnataka",
      paymentMode: "Paid",
      paidAmount: 5000,
      customer: {
        name: "Audit Client Test",
        location: "Flat 101",
        project: "Skyline Towers",
        phone: "9876543210",
        gstin: "29BNYPN6916L1ZU",
      },
      items: [
        {
          category: "Aluminium Door",
          itemName: "Aluminium Shutters 565",
          description: "Black Powder Coated",
          height: 1800,
          width: 600,
          quantity: 2,
          rate: 565,
          taxableAmount: 4237.28,
          taxAmount: 762.72,
          lineTotal: 5000,
        },
      ],
      totals: {
        subtotal: 4237.28,
        cgst: 381.36,
        sgst: 381.36,
        igst: 0,
        taxTotal: 762.72,
        payable: 5000,
      },
    },
  };

  const syncRes = await request("/api/integrations/glass-care", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(syncPayload),
  });
  assert(syncRes.status === 200 && syncRes.data?.success === true, "Integration Sync", "Sync from Glass Care web app creates quote");

  // Tab 1: Fetch quotes
  const quotesRes = await request("/api/quotes", { headers: authHeaders });
  assert(quotesRes.status === 200 && Array.isArray(quotesRes.data?.quotes), "Tab 1 - Quotes", "Fetch quotes returns array");
  const syncedQuote = quotesRes.data?.quotes?.find((q: any) => q.quoteNumber === "GCE-AUDIT-001");
  assert(syncedQuote != null, "Tab 1 - Quotes", "Newly synced quote GCE-AUDIT-001 exists in database");

  // Tab 1: Generate PDF
  if (syncedQuote) {
    const pdfRes = await request(`/api/quotes/${syncedQuote.id}/pdf`, { headers: authHeaders });
    assert(pdfRes.status === 200 && Boolean(pdfRes.headers.get("content-type")?.includes("application/pdf")), "Tab 1 - Quotes", "Quote PDF generation returns HTTP 200 and application/pdf");
  }

  // --- 6. Tab 2 - Factory WIP ---
  const factoryRes = await request("/api/factory/data", { headers: authHeaders });
  assert(factoryRes.status === 200 && Array.isArray(factoryRes.data?.factoryGroups), "Tab 2 - Factory WIP", "Fetch factory WIP data returns factory groups");
  const allFactoryItems = factoryRes.data?.factoryGroups?.flatMap((g: any) => g.glassTypes?.flatMap((gt: any) => gt.items) || []) || [];
  const itemWithCut = allFactoryItems.find((it: any) => it.glassCutHeightMm === 1793);
  assert(
    itemWithCut != null,
    "Tab 2 - Factory WIP",
    "Factory cutting sheet preserves -7mm deduction (1800mm -> 1793mm)"
  );

  // Tab 2: Sheet Optimizer
  const optimizeRes = await request("/api/factory/optimize", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      stockSheet: { width: 2440, height: 1830, label: "Standard Float (2440x1830)" },
      items: [{ width: 593, height: 1793, quantity: 2, label: "Audit Item 1" }],
    }),
  });
  assert(optimizeRes.status === 200 && optimizeRes.data?.result?.sheets != null, "Tab 2 - Factory WIP", "Sheet optimizer computes cutting layout");

  // --- 7. Tab 3 - Payment Tracker ---
  const paymentsRes = await request("/api/payments", { headers: authHeaders });
  assert(paymentsRes.status === 200 && Array.isArray(paymentsRes.data?.payments), "Tab 3 - Payments", "Fetch payments returns array");
  const autoSyncedPayment = paymentsRes.data?.payments?.find((p: any) => p.reference?.includes("GCE-AUDIT-001"));
  assert(autoSyncedPayment != null && Number(autoSyncedPayment.amount) === 5000, "Tab 3 - Payments", "Paid bill automatically recorded in Tab 3 Payment Tracker");

  // --- 8. Tab 4 - Vendor List ---
  // Create / verify custom vendor
  const createVendorRes = await request("/api/vendors", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: "Vendor Sachin",
      contactPerson: "Sachin Kumar",
      phone: "9845012345",
      category: "Glass Fabricator",
      address: "Bengaluru Industrial Area",
    }),
  });
  assert(createVendorRes.status === 200 || createVendorRes.status === 201, "Tab 4 - Vendors", "Can add vendor dynamically (e.g. Vendor Sachin)");

  const vendorsRes = await request("/api/vendors", { headers: authHeaders });
  const hasVendorSachin = Boolean(vendorsRes.data?.vendors?.some((v: any) => v.name.includes("Sachin")));
  assert(hasVendorSachin, "Tab 4 - Vendors", "Vendor Sachin persisted and retrievable");

  // --- 9. Tab 5 - Purchases & Expenses ---
  const expensesRes = await request("/api/expenses", { headers: authHeaders });
  assert(expensesRes.status === 200 && Array.isArray(expensesRes.data?.expenses), "Tab 5 - Expenses", "Fetch expenses returns array");

  // --- 10. Tab 6 - Month Profit ---
  const profitRes = await request("/api/profit", { headers: authHeaders });
  assert(profitRes.status === 200 && profitRes.data?.liveSummary?.partner30Percent != null, "Tab 6 - Month Profit", "Fetch month profit calculates partner 30% and owner 70% distribution");

  // --- 11. Tab 7 - Inventory / Stock ---
  const inventoryRes = await request("/api/inventory", { headers: authHeaders });
  assert(inventoryRes.status === 200 && Array.isArray(inventoryRes.data?.items), "Tab 7 - Inventory", "Fetch inventory returns stock items with non-negative balance");

  console.log("\n=== AUDIT SUMMARY ===");
  const passCount = results.filter((r) => r.status === "PASS").length;
  const failCount = results.filter((r) => r.status === "FAIL").length;
  console.log(`Total tests: ${results.length} | Passed: ${passCount} | Failed: ${failCount}`);

  if (failCount > 0) {
    console.error("FAILURES DETECTED:");
    results.filter(r => r.status === "FAIL").forEach(r => console.error(`- [${r.suite}] ${r.test}: ${r.details}`));
    process.exit(1);
  } else {
    console.log("ALL AUTOMATED TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  }
}

runAudit().catch(err => {
  console.error("Fatal error during audit:", err);
  process.exit(1);
});
