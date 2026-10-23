import { QuoteStatus } from "@prisma/client";

export const ALLOWED_STATUS_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT: [QuoteStatus.SENT, QuoteStatus.CANCELLED],
  SENT: [QuoteStatus.APPROVED, QuoteStatus.DRAFT, QuoteStatus.CANCELLED],
  APPROVED: [QuoteStatus.IN_PRODUCTION, QuoteStatus.CANCELLED],
  IN_PRODUCTION: [QuoteStatus.DELIVERED, QuoteStatus.CANCELLED],
  DELIVERED: [QuoteStatus.PAID, QuoteStatus.CANCELLED],
  PAID: [],
  CANCELLED: [QuoteStatus.DRAFT],
};

export function isValidStatusTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

