import { describe, expect, it } from "vitest";
import { glassCut, glassCutDimensions, roundUp } from "../round";

describe("roundUp", () => {
  it("rounds up frame height and width to steps of 76.2 mm", () => {
    expect(roundUp(1850).toNumber()).toBe(1905);
    expect(roundUp(415).toNumber()).toBe(457.2);
    expect(roundUp(913).toNumber()).toBe(914.4);
    expect(roundUp(550).toNumber()).toBe(609.6);
  });

  it("handles dimensions that are already exact multiples of 76.2", () => {
    expect(roundUp(76.2).toNumber()).toBe(76.2);
    expect(roundUp(152.4).toNumber()).toBe(152.4);
    expect(roundUp(304.8).toNumber()).toBe(304.8);
    expect(roundUp(1905).toNumber()).toBe(1905);
  });

  it("supports custom roundStep", () => {
    expect(roundUp(100, 50).toNumber()).toBe(100);
    expect(roundUp(101, 50).toNumber()).toBe(150);
  });
});

describe("glassCut", () => {
  it("deducts 7 mm by default", () => {
    expect(glassCut(1850).toNumber()).toBe(1843);
    expect(glassCut(415).toNumber()).toBe(408);
  });

  it("calculates both dimensions for glass cut", () => {
    const dimensions = glassCutDimensions(1850, 415);
    expect(dimensions.height.toNumber()).toBe(1843);
    expect(dimensions.width.toNumber()).toBe(408);
  });

  it("supports custom deduction", () => {
    const dimensions = glassCutDimensions(1850, 415, 10);
    expect(dimensions.height.toNumber()).toBe(1840);
    expect(dimensions.width.toNumber()).toBe(405);
  });
});

