import { describe, expect, it } from "vitest";
import { parsePricingOcr } from "./free-pricing-ocr";

describe("parsePricingOcr", () => {
  it("extracts a Chinese supplier quote", () => {
    const result = parsePricingOcr("150ml PET 泡沫瓶\nMOQ: 10,000个\n采购单价 ￥1.65\n不含税 EXW", 88);
    expect(result).toMatchObject({ capacity: "150ml", material: "PET", currency: "CNY", minimum_quantity: 10000, unit_price: 1.65, tax_included: "false", trade_term: "EXW" });
  });

  it("extracts an English USD quote", () => {
    const result = parsePricingOcr("250g PP jar\nMinimum quantity 5000 pcs\nUnit price USD 0.38\nincluding tax", 82);
    expect(result).toMatchObject({ capacity: "250g", material: "PP", currency: "USD", minimum_quantity: 5000, unit_price: 0.38, tax_included: "true" });
  });

  it("uses safe editable defaults when price and MOQ are missing", () => {
    const result = parsePricingOcr("product photo only", 70);
    expect(result.unit_price).toBe(0);
    expect(result.minimum_quantity).toBe(1);
    expect(result.notes).toContain("人工核对");
  });
});
