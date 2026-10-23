import Decimal from "decimal.js";
import { formatIndianCurrency } from "../calc/currency";

export interface MilestoneScheduleItem {
  name: string;
  percentage: number;
  expectedAmount: Decimal;
  paidAmount: Decimal;
  balanceAmount: Decimal;
  status: "PENDING" | "PARTIAL" | "PAID";
}

export interface QuotePaymentSummary {
  displayTotal: Decimal;
  totalPaid: Decimal;
  outstandingBalance: Decimal;
  isFullyPaid: boolean;
  milestones: MilestoneScheduleItem[];
}

export interface MilestoneConfig {
  name: string;
  percentage: number; // e.g. 70, 20, 10
}

export const DEFAULT_MILESTONES: MilestoneConfig[] = [
  { name: "Initial payment (70% on ordering)", percentage: 70 },
  { name: "Interim payment (20% on delivery)", percentage: 20 },
  { name: "Final payment (10% on completion)", percentage: 10 },
];

/**
 * Calculates milestone schedule and payment status for a quote
 */
export function calculatePaymentSchedule(
  displayTotal: number | Decimal,
  recordedPayments: Array<{ amount: number | Decimal; milestone?: string | null }>,
  customMilestones: MilestoneConfig[] = DEFAULT_MILESTONES
): QuotePaymentSummary {
  const total = new Decimal(displayTotal || 0);
  const totalPaid = recordedPayments.reduce(
    (acc, p) => acc.plus(new Decimal(p.amount || 0)),
    new Decimal(0)
  );

  const outstandingBalance = Decimal.max(0, total.minus(totalPaid));
  const isFullyPaid = totalPaid.greaterThanOrEqualTo(total) && total.greaterThan(0);

  // Distribute payments across milestones in order
  let remainingPaid = new Decimal(totalPaid);

  const milestones: MilestoneScheduleItem[] = customMilestones.map((m) => {
    // Expected amount = round(total * (percentage / 100))
    const expected = total.times(m.percentage).dividedBy(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    let allocatedPaid = new Decimal(0);
    if (remainingPaid.greaterThan(0)) {
      allocatedPaid = Decimal.min(remainingPaid, expected);
      remainingPaid = remainingPaid.minus(allocatedPaid);
    }

    const balance = Decimal.max(0, expected.minus(allocatedPaid));
    let status: "PENDING" | "PARTIAL" | "PAID" = "PENDING";
    if (allocatedPaid.greaterThanOrEqualTo(expected) && expected.greaterThan(0)) {
      status = "PAID";
    } else if (allocatedPaid.greaterThanOrEqualTo(1)) {
      // Substantial payment of ₹1 or more
      status = "PARTIAL";
    }

    return {
      name: m.name,
      percentage: m.percentage,
      expectedAmount: expected,
      paidAmount: allocatedPaid,
      balanceAmount: balance,
      status,
    };
  });

  return {
    displayTotal: total,
    totalPaid,
    outstandingBalance,
    isFullyPaid,
    milestones,
  };
}

/**
 * Generates sequential receipt number REC-DDMMYY-NN
 */
export function generateReceiptNumber(sequenceNumber: number, date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  const seq = String(sequenceNumber).padStart(2, "0");
  return `REC-${dd}${mm}${yy}-${seq}`;
}

/**
 * Creates WhatsApp payment reminder message
 */
export function formatPaymentReminderWhatsApp(params: {
  customerName: string;
  quoteNumber: string;
  outstandingBalance: number | Decimal;
  dueDateStr?: string;
  bankDetails?: {
    upi?: string;
    account?: string;
    ifsc?: string;
    bank?: string;
  };
}): string {
  const formattedBalance = formatIndianCurrency(params.outstandingBalance);

  let msg = `Dear ${params.customerName},\n\n`;
  msg += `Greetings from *Glass Care Enterprises*.\n`;
  msg += `This is a friendly reminder regarding the outstanding payment for Quotation *${params.quoteNumber}*.\n\n`;
  msg += `*Outstanding Balance: ${formattedBalance}*\n`;
  if (params.dueDateStr) {
    msg += `Due Date: ${params.dueDateStr}\n`;
  }
  msg += `\nPlease find payment details below:\n`;
  if (params.bankDetails?.upi) {
    msg += `• UPI ID: *${params.bankDetails.upi}*\n`;
  }
  if (params.bankDetails?.account) {
    msg += `• Bank: ${params.bankDetails.bank || "State Bank of India"}\n`;
    msg += `• Account: *${params.bankDetails.account}*\n`;
    msg += `• IFSC: *${params.bankDetails.ifsc || "SBIN0002263"}*\n`;
  }
  msg += `\nKindly share the transaction screenshot once completed.\nThank you for your business!`;

  return msg;
}
