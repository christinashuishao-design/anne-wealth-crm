import { describe, expect, it } from "vitest";
import { calculateFinance } from "./finance";

describe("calculateFinance", () => {
  it("uses decimal-safe currency math", () => {
    const result = calculateFinance("1000.10", "7.2", [
      { amount: "3000.05", rate: 1 },
      { amount: "100", rate: "7.2" },
    ]);
    expect(result.revenue.toString()).toBe("7200.72");
    expect(result.totalCost.toString()).toBe("3720.05");
    expect(result.profit.toString()).toBe("3480.67");
  });

  it("calculates order profit from every cost category", () => {
    const result = calculateFinance(700000, 1, [
      { amount: 11050, rate: 1 },
      { amount: 500, rate: 1 },
      { amount: 200, rate: 1 },
      { amount: 100, rate: 1 },
    ]);
    expect(result.totalCost.toString()).toBe("11850");
    expect(result.profit.toString()).toBe("688150");
    expect(result.margin.toDecimalPlaces(2).toString()).toBe("98.31");
  });

  it("returns zero margin for zero revenue", () =>
    expect(calculateFinance(0, 1, []).margin.toString()).toBe("0"));
});
