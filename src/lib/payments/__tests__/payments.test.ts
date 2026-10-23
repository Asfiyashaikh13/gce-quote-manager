import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  calculatePaymentSchedule,
  generateReceiptNumber,
  formatPaymentReminderWhatsApp,
} from "../milestones";

describe("Payment Milestones and Math", () => {
  it("calculates 70/20/10 schedule for quote total 25,347", () => {
    const total = 25347;
    const schedule = calculatePaymentSchedule(total, []);

    expect(schedule.displayTotal.toNumber()).toBe(25347);
    expect(schedule.totalPaid.toNumber()).toBe(0);
    expect(schedule.outstandingBalance.toNumber()).toBe(25347);
    expect(schedule.isFullyPaid).toBe(false);

    expect(schedule.milestones.length).toBe(3);

    // 70% of 25347 = 17742.90
    expect(schedule.milestones[0].percentage).toBe(70);
    expect(schedule.milestones[0].expectedAmount.toNumber()).toBe(17742.9);
    expect(schedule.milestones[0].status).toBe("PENDING");

    // 20% of 25347 = 5069.40
    expect(schedule.milestones[1].percentage).toBe(20);
    expect(schedule.milestones[1].expectedAmount.toNumber()).toBe(5069.4);
    expect(schedule.milestones[1].status).toBe("PENDING");

    // 10% of 25347 = 2534.70
    expect(schedule.milestones[2].percentage).toBe(10);
    expect(schedule.milestones[2].expectedAmount.toNumber()).toBe(2534.7);
    expect(schedule.milestones[2].status).toBe("PENDING");

    // Sum of expected milestones equals total
    const sumExpected = schedule.milestones.reduce(
      (sum, m) => sum.plus(m.expectedAmount),
      new Decimal(0)
    );
    expect(sumExpected.toNumber()).toBe(25347);
  });

  it("allocates part payment across milestones sequentially", () => {
    const total = 25347;
    // Advance payment of ₹17,743 (covers full 70% advance)
    const payment1 = [{ amount: 17743, milestone: "Advance" }];
    const schedule1 = calculatePaymentSchedule(total, payment1);

    expect(schedule1.totalPaid.toNumber()).toBe(17743);
    expect(schedule1.outstandingBalance.toNumber()).toBe(7604);
    expect(schedule1.milestones[0].status).toBe("PAID");
    expect(schedule1.milestones[1].status).toBe("PENDING");
    expect(schedule1.isFullyPaid).toBe(false);

    // Partial interim payment of ₹3,000 (partially covers 20% interim)
    const payment2 = [
      { amount: 17743, milestone: "Advance" },
      { amount: 3000, milestone: "Delivery" },
    ];
    const schedule2 = calculatePaymentSchedule(total, payment2);

    expect(schedule2.totalPaid.toNumber()).toBe(20743);
    expect(schedule2.outstandingBalance.toNumber()).toBe(4604);
    expect(schedule2.milestones[0].status).toBe("PAID");
    expect(schedule2.milestones[1].status).toBe("PARTIAL");
    expect(schedule2.milestones[1].paidAmount.toNumber()).toBe(3000.1); // 17743 - 17742.9 = 0.1 overflow into next
    expect(schedule2.milestones[2].status).toBe("PENDING");

    // Full final payment
    const payment3 = [
      { amount: 17743, milestone: "Advance" },
      { amount: 5070, milestone: "Delivery" },
      { amount: 2534, milestone: "Final" },
    ];
    const schedule3 = calculatePaymentSchedule(total, payment3);
    expect(schedule3.isFullyPaid).toBe(true);
    expect(schedule3.outstandingBalance.toNumber()).toBe(0);
    expect(schedule3.milestones[0].status).toBe("PAID");
    expect(schedule3.milestones[1].status).toBe("PAID");
    expect(schedule3.milestones[2].status).toBe("PAID");
  });

  it("generates formatted receipt numbers REC-DDMMYY-NN", () => {
    const date = new Date(2026, 9, 24); // 24 Oct 2026
    const rec1 = generateReceiptNumber(1, date);
    expect(rec1).toBe("REC-241026-01");

    const rec42 = generateReceiptNumber(42, date);
    expect(rec42).toBe("REC-241026-42");
  });

  it("generates WhatsApp payment reminder text with bank details", () => {
    const msg = formatPaymentReminderWhatsApp({
      customerName: "Mr. Fayaz",
      quoteNumber: "QT-241026-01",
      outstandingBalance: 7604,
      bankDetails: {
        upi: "9945988552@upi",
        account: "42443380892",
        ifsc: "SBIN0002263",
      },
    });

    expect(msg).toContain("Mr. Fayaz");
    expect(msg).toContain("QT-241026-01");
    expect(msg).toContain("₹7,604");
    expect(msg).toContain("9945988552@upi");
    expect(msg).toContain("42443380892");
    expect(msg).toContain("SBIN0002263");
  });
});
