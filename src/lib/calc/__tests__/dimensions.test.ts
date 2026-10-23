import { describe, expect, it } from "vitest";
import { calculateRunningFeet, calculateSqft } from "../dimensions";

describe("calculateSqft", () => {
  it("calculates square feet accurately", () => {
    // 1905x457.2 qty1 -> 9.375
    expect(calculateSqft(1905, 457.2, 1).toNumber()).toBe(9.375);

    // 304.8x457.2 qty2 -> 3
    expect(calculateSqft(304.8, 457.2, 2).toNumber()).toBe(3);
  });
});

describe("calculateRunningFeet", () => {
  it("calculates running feet accurately", () => {
    // 1371.6x533.4 qty2 -> 25
    expect(calculateRunningFeet(1371.6, 533.4, 2).toNumber()).toBe(25);
  });
});

