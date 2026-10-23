export function formatDateForQuoteNumber(date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

/**
 * Formats a quote number as QT-DDMMYY-NN
 * Example: QT-241026-01
 */
export function formatQuoteNumber(datePrefix: string, sequence: number): string {
  const nn = String(sequence).padStart(2, "0");
  return `QT-${datePrefix}-${nn}`;
}

