import { test, expect } from "@playwright/test";

test.describe("GCE Quote Manager End-to-End Suite", () => {
  test("1. Login flow and session authentication", async ({ page }) => {
    await page.goto("/login");

    // Check login form presence
    await expect(page.locator("h2")).toContainText("Sign in to GCE");

    // Fill credentials
    await page.fill('input[type="email"]', "admin@gce.local");
    await page.fill('input[type="password"]', "Admin@123");

    // Click submit
    await page.click('button[type="submit"]');

    // Admin seed user has mustChangePassword: true, so it redirects to /change-password or /
    await page.waitForURL(/\/(change-password|$)/);
  });

  test("2. Master Sheet loads, computes totals and displays rows", async ({ page }) => {
    await page.goto("/");

    // Verify main header
    await expect(page.locator("h1")).toContainText("Master Calculation Sheet");

    // Verify table columns exist
    await expect(page.locator("text=Glass Cut (H × W)")).toBeVisible();
    await expect(page.locator("text=Net (₹)")).toBeVisible();
    await expect(page.locator("text=Total (₹)")).toBeVisible();

    // Verify Mr. Fayaz Flat 27 row is loaded from seed
    await expect(page.locator("text=Mr. Fayaz").first()).toBeVisible();

    // Verify grand totals strip exists
    await expect(page.locator("text=Subtotal:")).toBeVisible();
    await expect(page.locator("text=Grand Total:")).toBeVisible();
  });

  test("3. Auto-grouped quotes tab displays Fayaz quote with seed-check values", async ({ page }) => {
    await page.goto("/");

    // Click Auto-Grouped Quotes tab button
    await page.click("button:has-text('Auto-Grouped Quotes')");

    // Check Fayaz group presence
    await expect(page.locator("text=Mr. Fayaz - Flat 27")).toBeVisible();

    // Verify seed check values
    // Grand Total: ₹25,347 (or 25,347.16)
    await expect(page.locator("text=₹25,347").first()).toBeVisible();
  });

  test("4. Quotations registry and quote detail page", async ({ page }) => {
    await page.goto("/quotes");

    await expect(page.locator("h1")).toContainText("Quotations Registry");

    // Check seed quote QT-241026-01
    const quoteLink = page.locator("a:has-text('QT-')").first();
    await expect(quoteLink).toBeVisible();

    // Navigate to quote detail
    await quoteLink.click();
    await page.waitForURL(/\/quotes\/.+/);

    // Verify detail page elements
    await expect(page.locator("text=Customer & Site")).toBeVisible();
    await expect(page.locator("text=Items Specification")).toBeVisible();
    await expect(page.locator("text=Payment Milestones")).toBeVisible();
    await expect(page.locator("text=Download PDF")).toBeVisible();
  });

  test("5. Factory Sheet and Guillotine Optimizer", async ({ page }) => {
    await page.goto("/factory");

    await expect(page.locator("h1")).toContainText("Factory Sheet & Optimizer");
    await expect(page.locator("text=Veera Glass").first()).toBeVisible();
    await expect(page.locator("text=Frame - 7 mm").first()).toBeVisible();

    // Switch to Optimizer tab
    await page.click("button:has-text('Sheet Cutting Optimizer')");
    await expect(page.locator("text=Guillotine Glass Cutting Optimizer Configuration")).toBeVisible();

    // Run optimization
    await page.click("button:has-text('Run Optimization')");

    // Verify results
    await expect(page.locator("text=Sheets Required")).toBeVisible();
    await expect(page.locator("text=Overall Wastage")).toBeVisible();
  });

  test("6. Payments and Milestone Management", async ({ page }) => {
    await page.goto("/payments");

    await expect(page.locator("h1")).toContainText("Payments & Milestones");
    await expect(page.locator("text=Total Collected")).toBeVisible();
    await expect(page.locator("text=Record Payment").first()).toBeVisible();

    // Open Record Payment Modal
    await page.click("button:has-text('Record Payment')");
    await expect(page.locator("h3:has-text('Record Customer Payment')")).toBeVisible();
  });

  test("7. Executive Dashboard with Analytics and Funnel", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.locator("h1")).toContainText("Executive Dashboard");
    await expect(page.locator("text=Total Quotes")).toBeVisible();
    await expect(page.locator("text=Monthly Value Trend")).toBeVisible();
    await expect(page.locator("text=Quotation Status Funnel")).toBeVisible();
  });
});
