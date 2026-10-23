import { formatIndianCurrency } from "../calc/currency";

export interface WhatsAppQuoteData {
  quoteNumber: string;
  customerName: string;
  displayTotal: number;
  itemCount: number;
  companyPhone?: string;
}

export function generateWhatsAppShareUrl(data: WhatsAppQuoteData): string {
  const formattedTotal = formatIndianCurrency(data.displayTotal);
  const message = [
    `*Quotation from Glass Care Enterprises*`,
    `----------------------------------------`,
    `*Quote No:* ${data.quoteNumber}`,
    `*Customer:* ${data.customerName}`,
    `*Total Items:* ${data.itemCount}`,
    `*Payable Amount:* ${formattedTotal}`,
    ``,
    `Payment via UPI: 9945988552@upi`,
    `A/c: 42443380892 (State Bank of India)`,
    ``,
    `Thank you for your business!`,
    `Contact: ${data.companyPhone || "7411415842"}`,
  ].join("\n");

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

