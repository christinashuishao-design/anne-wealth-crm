import { describe, expect, it } from "vitest";
import { nextOrderNumber, nextProjectNumber, orderNumberPrefix } from "./order-number";

describe("PI number generation", () => {
  const date = new Date("2026-08-05T02:00:00.000Z");

  it("uses the Shanghai calendar date", () => {
    expect(orderNumberPrefix(date)).toBe("PI#AC260805");
  });

  it("increments the daily sequence and ignores old order formats", () => {
    expect(nextOrderNumber(["ORD-2026-002", "PI#AC26080501"], date)).toBe(
      "PI#AC26080502",
    );
  });

  it("creates a date-based project number", () => {
    expect(nextProjectNumber(["OPP-001", "26080501"], date)).toBe("26080502");
  });
});
