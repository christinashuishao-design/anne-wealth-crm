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
    expect(result.unit_price).toBeNull();
    expect(result.minimum_quantity).toBeNull();
    expect(result.notes).toContain("已留空待确认");
  });

  it("extracts the primary price and preserves add-on prices from a chat quote", () => {
    const result = parsePricingOcr("24牙29克350ML实灰色平肩圆瓶（裸瓶无工艺）0.95元/个，24牙实色自带磨砂千秋盖0.55元/个，瓶身喷手感漆另加0.7元/个，盖子喷手感漆另加0.4元/个", 68);
    expect(result).toMatchObject({ capacity: "350ml", currency: "CNY", unit_price: 0.95 });
    expect(result.product_name).toContain("350ML");
    expect(result.notes).toContain("0.55");
    expect(result.notes).toContain("0.7");
    expect(result.notes).toContain("0.4");
  });

  it("keeps a minimum order amount separate from MOQ", () => {
    const result = parsePricingOcr("350ML瓶身0.95元/个，大货至少3500元", 75);
    expect(result.unit_price).toBe(0.95);
    expect(result.minimum_quantity).toBeNull();
    expect(result.minimum_order_amount).toBe(3500);
  });
});
