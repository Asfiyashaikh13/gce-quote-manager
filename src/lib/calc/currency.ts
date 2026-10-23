import { Decimal } from "decimal.js";

const ONES: readonly string[] = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS: Record<number, string> = {
  20: "Twenty",
  30: "Thirty",
  40: "Forty",
  50: "Fifty",
  60: "Sixty",
  70: "Seventy",
  80: "Eighty",
  90: "Ninety",
};

function twoDigitsToWords(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  const tensVal = Math.floor(n / 10) * 10;
  const rem = n % 10;
  return rem === 0 ? TENS[tensVal] : `${TENS[tensVal]} ${ONES[rem]}`;
}

function threeDigitsToWords(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rem = n % 100;
  const parts: string[] = [];

  if (hundreds > 0) {
    parts.push(`${ONES[hundreds]} Hundred`);
  }

  if (rem > 0) {
    if (parts.length > 0) {
      parts.push("And");
    }
    parts.push(twoDigitsToWords(rem));
  }

  return parts.join(" ");
}

function integerToIndianWords(num: number): string {
  if (num === 0) return "Zero";

  const parts: string[] = [];

  const crores = Math.floor(num / 10000000);
  let rem = num % 10000000;

  const lakhs = Math.floor(rem / 100000);
  rem = rem % 100000;

  const thousands = Math.floor(rem / 1000);
  rem = rem % 1000;

  const hundreds = rem;

  if (crores > 0) {
    parts.push(`${integerToIndianWords(crores)} Crore`);
  }

  if (lakhs > 0) {
    parts.push(`${twoDigitsToWords(lakhs)} Lakh`);
  }

  if (thousands > 0) {
    parts.push(`${twoDigitsToWords(thousands)} Thousand`);
  }

  if (hundreds > 0) {
    if (hundreds < 100 && parts.length > 0) {
      parts.push(`And ${twoDigitsToWords(hundreds)}`);
    } else {
      parts.push(threeDigitsToWords(hundreds));
    }
  }

  return parts.join(" ");
}

/**
 * Converts a numeric amount to Indian Rupee words format.
 * Example: 25347 -> "Indian Rupee Twenty Five Thousand Three Hundred And Forty Seven Only"
 */
export function numberToIndianWords(amount: Decimal | number | string): string {
  const d = new Decimal(amount).abs();
  const integerPart = d.floor().toNumber();
  const fractionalPart = d.minus(d.floor()).times(100).round().toNumber();

  const wordsPart = integerToIndianWords(integerPart);
  let result = `Indian Rupee ${wordsPart}`;

  if (fractionalPart > 0) {
    const paiseWords = twoDigitsToWords(fractionalPart);
    result += ` And ${paiseWords} Paise`;
  }

  result += " Only";
  return result;
}

export interface FormatCurrencyOptions {
  symbol?: string;
  showDecimals?: boolean;
  decimals?: number;
}

/**
 * Formats a number in the Indian numbering system (e.g., ₹1,00,000 or ₹21,480.63).
 */
export function formatIndianCurrency(
  amount: Decimal | number | string,
  options: FormatCurrencyOptions = {}
): string {
  const { symbol = "₹", showDecimals, decimals } = options;

  let d = new Decimal(amount);
  const isNegative = d.isNegative();
  d = d.abs();

  let formattedValue: string;
  if (decimals !== undefined) {
    formattedValue = d.toFixed(decimals);
  } else {
    formattedValue = d.toString();
  }

  const [intPart, decPart] = formattedValue.split(".");

  let formattedInt = "";
  if (intPart.length <= 3) {
    formattedInt = intPart;
  } else {
    const lastThree = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    const groups: string[] = [];
    for (let i = rest.length; i > 0; i -= 2) {
      const start = Math.max(0, i - 2);
      groups.unshift(rest.slice(start, i));
    }
    formattedInt = `${groups.join(",")},${lastThree}`;
  }

  let result = symbol ? `${symbol}${formattedInt}` : formattedInt;

  if (showDecimals === true) {
    result += `.${(decPart ?? "00").padEnd(2, "0").slice(0, 2)}`;
  } else if (showDecimals !== false && decPart !== undefined && decPart.length > 0) {
    result += `.${decPart}`;
  }

  return isNegative ? `-${result}` : result;
}

