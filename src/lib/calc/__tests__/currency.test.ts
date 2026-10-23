import { describe, expect, it } from "vitest";
import { formatIndianCurrency, numberToIndianWords } from "../currency";

describe("formatIndianCurrency", () => {
  it("formats Indian currency numbers with ₹ symbol and commas", () => {
    expect(formatIndianCurrency(100000)).toBe("₹1,00,000");
    expect(formatIndianCurrency(25347)).toBe("₹25,347");
    expect(formatIndianCurrency("21480.63")).toBe("₹21,480.63");
    expect(formatIndianCurrency(25347.16)).toBe("₹25,347.16");
    expect(formatIndianCurrency(10000000)).toBe("₹1,00,00,000");
  });

  it("handles negative numbers", () => {
    expect(formatIndianCurrency(-0.16)).toBe("-₹0.16");
    expect(formatIndianCurrency(-100000)).toBe("-₹1,00,000");
  });

  it("supports formatting without symbol or with explicit decimals", () => {
    expect(formatIndianCurrency(100000, { symbol: "" })).toBe("1,00,000");
    expect(formatIndianCurrency(25347, { showDecimals: true })).toBe("₹25,347.00");
  });
});

describe("numberToIndianWords", () => {
  it("converts 25347 to Indian Rupee words correctly", () => {
    expect(numberToIndianWords(25347)).toBe(
      "Indian Rupee Twenty Five Thousand Three Hundred And Forty Seven Only"
    );
  });

  it("handles zero and various integer magnitudes", () => {
    expect(numberToIndianWords(0)).toBe("Indian Rupee Zero Only");
    expect(numberToIndianWords(100)).toBe("Indian Rupee One Hundred Only");
    expect(numberToIndianWords(105)).toBe("Indian Rupee One Hundred And Five Only");
    expect(numberToIndianWords(1000)).toBe("Indian Rupee One Thousand Only");
    expect(numberToIndianWords(100000)).toBe("Indian Rupee One Lakh Only");
    expect(numberToIndianWords(10000000)).toBe("Indian Rupee One Crore Only");
  });

  it("handles fractional amounts (paise)", () => {
    expect(numberToIndianWords("25347.16")).toBe(
      "Indian Rupee Twenty Five Thousand Three Hundred And Forty Seven And Sixteen Paise Only"
    );
  });
});

